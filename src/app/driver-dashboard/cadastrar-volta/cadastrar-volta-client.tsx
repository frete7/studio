
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
import { Loader2, PlusCircle, Trash2, CalendarIcon, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type IBGEState = { id: number; sigla: string; nome: string; };
type IBGECity = { id: number; nome: string; };


const locationSchema = z.object({
  state: z.string({ required_error: "O estado é obrigatório."}).min(1, "O estado é obrigatório."),
  city: z.string({ required_error: "A cidade é obrigatória."}).min(1, "A cidade é obrigatória."),
});


const returnTripSchema = z.object({
  origin: locationSchema,
  destinationType: z.enum(['brasil', 'estado', 'cidade'], { required_error: "Selecione o tipo de destino." }),
  destinationState: z.string().optional(),
  destinationCity: z.string().optional(),
  departureDate: z.date({ required_error: "A data de partida é obrigatória." }),
  departureTime: z.string({ required_error: "A hora de partida é obrigatória." }).min(1, "A hora de partida é obrigatória."),
}).refine(data => data.destinationType !== 'estado' || (data.destinationState && data.destinationState.length > 0), {
    message: "O estado é obrigatório.",
    path: ["destinationState"],
}).refine(data => data.destinationType !== 'cidade' || (data.destinationState && data.destinationState.length > 0 && data.destinationCity && data.destinationCity.length > 0), {
    message: "Estado e cidade são obrigatórios.",
    path: ["destinationCity"],
});

const formSchema = z.object({
  vehicle: z.string({ required_error: "Selecione um veículo." }),
  availability: z.enum(['vazio', 'parcial'], { required_error: "Selecione a disponibilidade." }),
  notes: z.string().optional(),
  hasCnpj: z.boolean().default(false),
  issuesInvoice: z.boolean().default(false),
  returns: z.array(returnTripSchema).min(1, "Adicione pelo menos uma rota de retorno.").max(5, "Você pode adicionar no máximo 5 rotas."),
});

type FormData = z.infer<typeof formSchema>;


function LocationSelector({ nestName, label, onStateChange }: { nestName: string, label: string, onStateChange?: (state: string) => void }) {
    const { control, watch, setValue } = useFormContext<FormData>();
    const [states, setStates] = useState<IBGEState[]>([]);
    const [cities, setCities] = useState<IBGECity[]>([]);
    const [isLoadingStates, setIsLoadingStates] = useState(false);
    const [isLoadingCities, setIsLoadingCities] = useState(false);

    const selectedState = watch(`${nestName}.state` as const);

    useEffect(() => {
        setIsLoadingStates(true);
        fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
            .then(res => res.json())
            .then((data : IBGEState[]) => { setStates(data); setIsLoadingStates(false); });
    }, []);

    useEffect(() => {
        if (selectedState) {
            setIsLoadingCities(true);
            setValue(`${nestName}.city` as const, '', { shouldValidate: true });
            fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedState}/municipios?orderBy=nome`)
                .then(res => res.json())
                .then((data: IBGECity[]) => { setCities(data); setIsLoadingCities(false); });
        } else {
            setCities([]);
        }
    }, [selectedState, nestName, setValue]);

    return (
        <div className="space-y-4">
            <p className="font-medium text-sm">{label}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={control}
                    name={`${nestName}.state` as const}
                    render={({ field }) => (
                        <FormItem>
                            <Select onValueChange={(value) => {
                                field.onChange(value);
                                if(onStateChange) onStateChange(value);
                            }} defaultValue={field.value} disabled={isLoadingStates}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Selecione o Estado" /></SelectTrigger></FormControl>
                                <SelectContent>{states.map(s => <SelectItem key={s.id} value={s.sigla}>{s.nome}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={control}
                    name={`${nestName}.city` as const}
                    render={({ field }) => (
                         <FormItem>
                            <Select onValueChange={field.onChange} value={field.value} disabled={!selectedState || isLoadingCities}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Selecione a Cidade" /></SelectTrigger></FormControl>
                                <SelectContent>{cities.map(c => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </div>
    );
}


function DestinationSelector({ nestName }: { nestName: string }) {
    const { control, watch, setValue } = useFormContext<FormData>();
    const destinationType = watch(`${nestName}.destinationType`);
    
    const [states, setStates] = useState<IBGEState[]>([]);
    const [cities, setCities] = useState<IBGECity[]>([]);
    const [isLoadingStates, setIsLoadingStates] = useState(false);
    const [isLoadingCities, setIsLoadingCities] = useState(false);
    
    const selectedState = watch(`${nestName}.destinationState`);

     useEffect(() => {
        if(destinationType === 'estado' || destinationType === 'cidade') {
            setIsLoadingStates(true);
            fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
                .then(res => res.json())
                .then(data => { setStates(data); setIsLoadingStates(false); });
        }
    }, [destinationType]);

    useEffect(() => {
        if (selectedState && destinationType === 'cidade') {
            setIsLoadingCities(true);
            setValue(`${nestName}.destinationCity`, '', { shouldValidate: true });
            fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedState}/municipios?orderBy=nome`)
                .then(res => res.json())
                .then(data => { setCities(data); setIsLoadingCities(false); });
        }
    }, [selectedState, destinationType, nestName, setValue]);


    return (
        <div className="space-y-4">
             <FormField
                control={control}
                name={`${nestName}.destinationType` as const}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-sm font-medium">Vou retornar para:</FormLabel>
                        <FormControl>
                            <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-col md:flex-row gap-4 pt-2"
                            >
                                <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="brasil" /></FormControl><FormLabel className="font-normal">Brasil Todo</FormLabel></FormItem>
                                <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="estado" /></FormControl><FormLabel className="font-normal">Estado</FormLabel></FormItem>
                                <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="cidade" /></FormControl><FormLabel className="font-normal">Cidade</FormLabel></FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
             {(destinationType === 'estado' || destinationType === 'cidade') && (
                 <FormField
                    control={control}
                    name={`${nestName}.destinationState` as const}
                    render={({ field }) => (
                        <FormItem>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingStates}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Selecione o Estado" /></SelectTrigger></FormControl>
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
                    name={`${nestName}.destinationCity` as const}
                    render={({ field }) => (
                         <FormItem>
                            <Select onValueChange={field.onChange} value={field.value} disabled={!selectedState || isLoadingCities}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Selecione a Cidade" /></SelectTrigger></FormControl>
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

function ReturnCard({ nestIndex, remove }: { nestIndex: number; remove: (index: number) => void; }) {
    const { control, watch } = useFormContext<FormData>();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const origin = watch(`returns.${nestIndex}.origin`);
    const destinationType = watch(`returns.${nestIndex}.destinationType`);
    const destinationState = watch(`returns.${nestIndex}.destinationState`);
    const destinationCity = watch(`returns.${nestIndex}.destinationCity`);

    const getReturnTitle = () => {
        if (!origin.state || !origin.city) return `Retorno ${nestIndex + 1}`;
        let destText = 'Brasil Todo';
        if (destinationType === 'estado') destText = `Estado de ${destinationState}`;
        if (destinationType === 'cidade') destText = `${destinationCity}, ${destinationState}`;

        return `De ${origin.city}, ${origin.state} para ${destText}`;
    }
    
    return (
        <Card className="relative">
            <CardHeader className="flex flex-row items-center justify-between cursor-pointer p-4" onClick={() => setIsCollapsed(!isCollapsed)}>
                <CardTitle className="text-base font-medium">{getReturnTitle()}</CardTitle>
                <div className="flex items-center gap-2">
                    <Button type="button" variant="ghost" size="icon" className="hover:bg-transparent" onClick={(e) => { e.stopPropagation(); setIsCollapsed(!isCollapsed); }}>
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isCollapsed && "rotate-180")} />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); remove(nestIndex); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
            </CardHeader>
            {!isCollapsed && (
                <CardContent className="space-y-6 p-4 pt-0">
                    <Separator />
                     <div className="grid md:grid-cols-2 gap-6 pt-4">
                        <FormField
                            control={control}
                            name={`returns.${nestIndex}.departureDate`}
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
                            name={`returns.${nestIndex}.departureTime`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Horário de Partida</FormLabel>
                                    <FormControl><Input type="time" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <LocationSelector nestName={`returns.${nestIndex}.origin`} label="Estou saindo de:" />
                    <Separator />
                    <DestinationSelector nestName={`returns.${nestIndex}`} />
                </CardContent>
            )}
        </Card>
    );
}

export default function CadastrarVoltaClient({ driverId, profile, vehicles }: { driverId: string, profile: any, vehicles: any[] }) {
    const { toast } = useToast();
    const router = useRouter();
    
    const methods = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            availability: 'vazio',
            notes: '',
            hasCnpj: profile.hasCnpj || false,
            issuesInvoice: profile.issuesInvoice || false,
            returns: [{ 
                origin: { state: '', city: ''},
                destinationType: 'brasil',
                destinationState: '',
                destinationCity: '',
                departureTime: '',
                departureDate: undefined,
            }],
        }
    });
    
    const { control, handleSubmit, formState: { isSubmitting } } = methods;

    const { fields, append, remove } = useFieldArray({
        control,
        name: "returns",
    });
    
    const onSubmit = async (data: FormData) => {
        try {
            const dataToSave = {
                ...data,
                returns: data.returns.map(r => {
                    const combinedDateTime = new Date(r.departureDate);
                    const [hours, minutes] = r.departureTime.split(':');
                    combinedDateTime.setHours(parseInt(hours), parseInt(minutes));
                    return {
                        ...r,
                        departureDate: combinedDateTime,
                    }
                })
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
        }
    };

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)}>
                <Card>
                    <CardHeader>
                        <CardTitle>Dados Gerais</CardTitle>
                        <CardDescription>Informações que se aplicam a todas as rotas de retorno.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
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
                             <FormField
                                control={control}
                                name="availability"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Disponibilidade do Veículo</FormLabel>
                                        <FormControl>
                                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4 pt-2">
                                                <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="vazio" /></FormControl><FormLabel className="font-normal">Vazio</FormLabel></FormItem>
                                                <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="parcial" /></FormControl><FormLabel className="font-normal">Parcial</FormLabel></FormItem>
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
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
                     <h2 className="text-xl font-bold">Rotas de Retorno</h2>
                     {fields.map((field, index) => (
                        <ReturnCard key={field.id} nestIndex={index} remove={remove} />
                     ))}
                </div>
                 {fields.length < 5 && (
                    <Button type="button" variant="outline" className="w-full mt-6" onClick={() => append({ 
                            origin: {state: '', city: ''}, 
                            destinationType: 'brasil', 
                            destinationCity: '', 
                            destinationState: '', 
                            departureDate: undefined, 
                            departureTime: '' 
                        })}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Adicionar outra rota de retorno
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

