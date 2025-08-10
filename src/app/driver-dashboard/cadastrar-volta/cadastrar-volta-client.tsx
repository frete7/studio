
'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, FormProvider, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { addReturnTrips } from '@/app/actions';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Loader2, PlusCircle, Trash2, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type IBGEState = { id: number; sigla: string; nome: string; };
type IBGECity = { id: number; nome: string; };


const returnTripSchema = z.object({
  destinationType: z.enum(['brasil', 'estado', 'cidade'], { required_error: "Selecione o tipo de destino." }),
  destinationState: z.string().optional(),
  destinationCity: z.string().optional(),
}).refine(data => data.destinationType !== 'estado' || (data.destinationState && data.destinationState.length > 0), {
    message: "O estado é obrigatório.",
    path: ["destinationState"],
}).refine(data => data.destinationType !== 'cidade' || (data.destinationState && data.destinationState.length > 0 && data.destinationCity && data.destinationCity.length > 0), {
    message: "Estado e cidade são obrigatórios.",
    path: ["destinationCity"],
});

const formSchema = z.object({
  origin: z.string().min(3, "A cidade de origem é obrigatória."),
  departureDate: z.date({ required_error: "A data de partida é obrigatória." }),
  departureTime: z.string({ required_error: "A hora de partida é obrigatória." }),
  vehicle: z.string({ required_error: "Selecione um veículo." }),
  availability: z.enum(['vazio', 'parcial'], { required_error: "Selecione a disponibilidade." }),
  notes: z.string().optional(),
  hasCnpj: z.boolean().default(false),
  issuesInvoice: z.boolean().default(false),
  returns: z.array(returnTripSchema).min(1, "Adicione pelo menos um retorno.").max(5, "Você pode adicionar no máximo 5 retornos."),
});

type FormData = z.infer<typeof formSchema>;


function DestinationFields({ nestIndex }: { nestIndex: number }) {
    const { control, watch, setValue } = useFormContext<FormData>();
    const [states, setStates] = useState<IBGEState[]>([]);
    const [cities, setCities] = useState<IBGECity[]>([]);
    const [isLoadingStates, setIsLoadingStates] = useState(false);
    const [isLoadingCities, setIsLoadingCities] = useState(false);

    const destinationType = watch(`returns.${nestIndex}.destinationType`);
    const selectedState = watch(`returns.${nestIndex}.destinationState`);

    useEffect(() => {
        setIsLoadingStates(true);
        fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
            .then(res => res.json())
            .then(data => { setStates(data); setIsLoadingStates(false); });
    }, []);

    useEffect(() => {
        if (selectedState) {
            setIsLoadingCities(true);
            setValue(`returns.${nestIndex}.destinationCity`, '');
            fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedState}/municipios?orderBy=nome`)
                .then(res => res.json())
                .then(data => { setCities(data); setIsLoadingCities(false); });
        } else {
            setCities([]);
        }
    }, [selectedState, nestIndex, setValue]);

    return (
        <div className="space-y-4">
            <FormField
                control={control}
                name={`returns.${nestIndex}.destinationType`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Tipo de Destino</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="brasil">Brasil Todo</SelectItem>
                                <SelectItem value="estado">Apenas Estado</SelectItem>
                                <SelectItem value="cidade">Cidade Específica</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
            {(destinationType === 'estado' || destinationType === 'cidade') && (
                <FormField
                    control={control}
                    name={`returns.${nestIndex}.destinationState`}
                    render={({ field }) => (
                         <FormItem>
                            <FormLabel>Estado</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingStates}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                                <SelectContent>{states.map(s => <SelectItem key={s.id} value={s.sigla}>{s.nome}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}
            {destinationType === 'cidade' && (
                 <FormField
                    control={control}
                    name={`returns.${nestIndex}.destinationCity`}
                    render={({ field }) => (
                         <FormItem>
                            <FormLabel>Cidade</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedState || isLoadingCities}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                                <SelectContent>{cities.map(c => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}
        </div>
    )
}


export default function CadastrarVoltaClient({ driverId, profile, vehicles }: { driverId: string, profile: any, vehicles: any[] }) {
    const { toast } = useToast();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const methods = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            origin: '',
            departureTime: '',
            availability: 'vazio',
            notes: '',
            hasCnpj: profile.hasCnpj || false,
            issuesInvoice: profile.issuesInvoice || false,
            returns: [{ destinationType: 'brasil' }],
        }
    });
    
    const { control, handleSubmit } = methods;

    const { fields, append, remove } = useFieldArray({
        control,
        name: "returns",
    });
    
    const onSubmit = async (data: FormData) => {
        setIsSubmitting(true);
        try {
            const combinedDateTime = new Date(data.departureDate);
            const [hours, minutes] = data.departureTime.split(':');
            combinedDateTime.setHours(parseInt(hours), parseInt(minutes));

            const dataToSave = {
                ...data,
                departureDate: combinedDateTime,
            };

            await addReturnTrips(driverId, dataToSave);
            
            toast({
                title: "Sucesso!",
                description: "Sua viagem de volta foi cadastrada e já está visível para as empresas."
            });
            router.push('/driver-dashboard');
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erro ao cadastrar',
                description: error instanceof Error ? error.message : 'Ocorreu um erro.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)}>
                <Card>
                    <CardHeader>
                        <CardTitle>Dados da Viagem</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                         <div className="grid md:grid-cols-2 gap-6">
                            <FormField
                                control={control}
                                name="origin"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Estou saindo de:</FormLabel>
                                        <FormControl><Input placeholder="Cidade de Origem" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
                                name="vehicle"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Veículo Utilizado</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Selecione um veículo..." /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.model} ({v.licensePlate})</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            <FormField
                                control={control}
                                name="departureDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col pt-2">
                                        <FormLabel>Data de Partida</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                        {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() -1))} initialFocus />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={control}
                                name="departureTime"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Horário de Partida</FormLabel>
                                        <FormControl><Input type="time" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                         <FormField
                            control={control}
                            name="availability"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Disponibilidade do Veículo</FormLabel>
                                    <FormControl>
                                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4 pt-2">
                                            <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="vazio" /></FormControl><FormLabel>Vazio</FormLabel></FormItem>
                                            <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="parcial" /></FormControl><FormLabel>Parcial</FormLabel></FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid md:grid-cols-2 gap-4">
                             <FormField control={control} name="hasCnpj" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3"><FormLabel>Possuo CNPJ</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                             <FormField control={control} name="issuesInvoice" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3"><FormLabel>Emito Nota Fiscal</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                        </div>
                         <FormField
                            control={control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Observações (Opcional)</FormLabel>
                                    <FormControl><Textarea placeholder="Alguma informação adicional sobre a viagem ou veículo?" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                <div className="space-y-6 mt-8">
                     {fields.map((field, index) => (
                        <Card key={field.id} className="relative">
                            <CardHeader>
                                <CardTitle>Retorno {index + 1}</CardTitle>
                                {fields.length > 1 && (
                                     <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => remove(index)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent>
                                <DestinationFields nestIndex={index} />
                            </CardContent>
                        </Card>
                     ))}
                </div>
                 {fields.length < 5 && (
                    <Button type="button" variant="outline" className="w-full mt-6" onClick={() => append({ destinationType: 'brasil' })}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Adicionar outro retorno
                    </Button>
                 )}
                  <FormField control={control} name="returns" render={({fieldState}) => <FormMessage className="text-center mt-2">{fieldState.error?.root?.message}</FormMessage>} />
                
                <div className="mt-8 flex justify-end">
                    <Button type="submit" size="lg" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Cadastrar Volta(s)
                    </Button>
                </div>
            </form>
        </FormProvider>
    );
}

    