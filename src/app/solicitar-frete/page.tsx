
'use client';

import { useState, useEffect } from 'react';
import { useForm, FormProvider, useFormContext, Controller, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from "date-fns";
import { ptBR } from 'date-fns/locale';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarIcon, Loader2, PlusCircle, Trash2, CheckCircle, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

// =================================================================
// Schemas de Validação (Zod)
// =================================================================

const baseLocationSchema = z.object({
    state: z.string().min(2, "UF é obrigatório"),
    city: z.string().min(2, "Cidade é obrigatória"),
    neighborhood: z.string().min(2, "Bairro é obrigatório"),
    locationType: z.enum(['casa', 'apartamento', 'sobrado'], {
        required_error: "Selecione o tipo de local"
    }),
    floor: z.string({ required_error: "Andar é obrigatório" }),
    accessType: z.enum(['elevador', 'escada', 'rampa']).optional(),
    distance: z.string().min(1, "Distância é obrigatória").regex(/^\d+$/, "Apenas números são permitidos"),
});

const locationSchema = baseLocationSchema.refine(data => {
    if (data.floor !== 'Térreo' && !data.accessType) {
        return false;
    }
    return true;
}, {
    message: "O tipo de acesso é obrigatório se não for no térreo",
    path: ["accessType"],
});

const originSchema = baseLocationSchema.extend({
    dateTime: z.date({
        required_error: "Data e hora são obrigatórios"
    }).refine(date => date > new Date(), {
        message: "A data deve ser no futuro"
    }),
}).refine(data => {
    if (data.floor !== 'Térreo' && !data.accessType) {
        return false;
    }
    return true;
}, {
    message: "O tipo de acesso é obrigatório se não for no térreo",
    path: ["accessType"],
});


const itemsSchema = z.object({
    type: z.enum(['description', 'list'], { required_error: "Selecione como informar os itens." }),
    description: z.string().optional(),
    list: z.array(z.object({ value: z.string().min(1, "Item não pode ser vazio") })).optional(),
}).refine(data => {
    if (data.type === 'description' && (!data.description || data.description.length < 10)) {
        return false;
    }
    if (data.type === 'list' && (!data.list || data.list.length === 0)) {
        return false;
    }
    return true;
}, {
    message: "Forneça uma descrição com pelo menos 10 caracteres ou adicione pelo menos um item à lista.",
    path: ['description'], // Show error on the first field
});

const additionalInfoSchema = z.object({
    hasRestriction: z.boolean().default(false),
    restrictionDetails: z.string().optional(),
    needsAssembly: z.boolean().default(false),
    assemblyItems: z.array(z.object({ value: z.string().min(1, "Item não pode ser vazio.") })).optional(),
    needsPackaging: z.boolean().default(false),
    packagingItems: z.array(z.object({ value: z.string().min(1, "Item não pode ser vazio.") })).optional(),
    hasSchedulePreference: z.boolean().default(false),
    scheduleDetails: z.string().optional(),
    hasParkingRestriction: z.boolean().default(false),
    parkingRestrictionDetails: z.string().optional(),
    needsStorage: z.boolean().default(false),
    needsItemPackaging: z.boolean().default(false),
    itemPackagingDetails: z.array(z.object({ value: z.string().min(1, "Item não pode ser vazio.") })).optional(),
    companyPreference: z.enum(['price', 'quality', 'cost_benefit'], { required_error: "Selecione sua preferência." }),
}).refine(data => !data.hasRestriction || (data.restrictionDetails && data.restrictionDetails.length > 0), {
    message: "Por favor, descreva a restrição.",
    path: ['restrictionDetails']
}).refine(data => !data.needsAssembly || (data.assemblyItems && data.assemblyItems.length > 0), {
    message: "Adicione pelo menos um móvel para montagem/desmontagem.",
    path: ['assemblyItems']
}).refine(data => !data.needsPackaging || (data.packagingItems && data.packagingItems.length > 0), {
    message: "Adicione pelo menos um móvel para embalar.",
    path: ['packagingItems']
}).refine(data => !data.hasSchedulePreference || (data.scheduleDetails && data.scheduleDetails.length > 0), {
    message: "Por favor, informe o horário preferencial.",
    path: ['scheduleDetails']
}).refine(data => !data.hasParkingRestriction || (data.parkingRestrictionDetails && data.parkingRestrictionDetails.length > 0), {
    message: "Por favor, descreva a restrição ou taxa.",
    path: ['parkingRestrictionDetails']
}).refine(data => !data.needsItemPackaging || (data.itemPackagingDetails && data.itemPackagingDetails.length > 0), {
    message: "Adicione pelo menos um item a ser embalado.",
    path: ['itemPackagingDetails']
});

const contactSchema = z.object({
    phoneType: z.enum(['whatsapp', 'fixo'], { required_error: 'Selecione o tipo de telefone.' }),
    fullName: z.string().min(3, "Nome completo é obrigatório."),
    phone: z.string().min(10, "Telefone inválido.").transform(val => val.replace(/\D/g, '')),
    confirmPhone: z.string().min(10, "Confirmação de telefone inválida.").transform(val => val.replace(/\D/g, '')),
    email: z.string().email("Email inválido."),
}).refine(data => data.phone === data.confirmPhone, {
    message: "Os telefones não coincidem.",
    path: ['confirmPhone'],
});


const formSchema = z.object({
  origin: originSchema,
  destinations: z.array(locationSchema).min(1, "Adicione pelo menos um destino."),
  items: itemsSchema,
  additionalInfo: additionalInfoSchema,
  contact: contactSchema,
});

type FormData = z.infer<typeof formSchema>;

const steps = [
  { id: 1, name: 'Origem', fields: ['origin'] },
  { id: 2, name: 'Destino(s)', fields: ['destinations'] },
  { id: 3, name: 'Itens', fields: ['items'] },
  { id: 4, name: 'Detalhes Finais', fields: ['additionalInfo'] },
  { id: 5, name: 'Contato', fields: ['contact'] },
];

type IBGEState = { id: number; sigla: string; nome: string; };
type IBGECity = { id: number; nome: string; };

const generateFreightId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nums = '0123456789';
    const randomChar = () => chars.charAt(Math.floor(Math.random() * chars.length));
    const randomNum = () => nums.charAt(Math.floor(Math.random() * nums.length));
    return `#CO-${randomNum()}${randomNum()}${randomChar()}${randomChar()}${randomChar()}`;
}

// =================================================================
// Componentes das Etapas
// =================================================================

function LocationFormFields({ nestName, showDateTime = false }: { nestName: string, showDateTime?: boolean }) {
    const { control, watch, setValue } = useFormContext();
    
    const [states, setStates] = useState<IBGEState[]>([]);
    const [cities, setCities] = useState<IBGECity[]>([]);
    const [isLoadingStates, setIsLoadingStates] = useState(false);
    const [isLoadingCities, setIsLoadingCities] = useState(false);

    const selectedState = watch(`${nestName}.state`);
    const floorValue = watch(`${nestName}.floor`);
    const isTerreo = floorValue === 'Térreo';

    useEffect(() => {
        setIsLoadingStates(true);
        fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
            .then(res => res.json())
            .then(data => {
                setStates(data);
                setIsLoadingStates(false);
            });
    }, []);

    useEffect(() => {
        if (selectedState) {
            setIsLoadingCities(true);
            setValue(`${nestName}.city`, ''); // Reset city when state changes
            fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedState}/municipios?orderBy=nome`)
                .then(res => res.json())
                .then(data => {
                    setCities(data);
                    setIsLoadingCities(false);
                });
        }
    }, [selectedState, nestName, setValue]);


    const floorOptions = [
        ...Array.from({ length: 5 }, (_, i) => (i - 5).toString()),
        'Térreo',
        ...Array.from({ length: 89 }, (_, i) => (i + 1).toString())
    ];

    const handleDistanceChange = (e: React.ChangeEvent<HTMLInputElement>, field: any) => {
        const value = e.target.value;
        const numbersOnly = value.replace(/\D/g, '');
        field.onChange(numbersOnly);
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <FormField
                    control={control}
                    name={`${nestName}.state`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Estado (UF)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingStates}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder={isLoadingStates ? "Carregando..." : "Selecione o estado"} />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {states.map(state => (
                                        <SelectItem key={state.id} value={state.sigla}>{state.nome}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={control}
                    name={`${nestName}.city`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Cidade</FormLabel>
                             <Select onValueChange={field.onChange} value={field.value} disabled={!selectedState || isLoadingCities}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder={isLoadingCities ? "Carregando..." : "Selecione a cidade"} />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {cities.map(city => (
                                        <SelectItem key={city.id} value={city.nome}>{city.nome}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
             <FormField
                control={control}
                name={`${nestName}.neighborhood`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Bairro</FormLabel>
                        <FormControl>
                            <Input placeholder="Digite o nome do bairro" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={control}
                name={`${nestName}.locationType`}
                render={({ field }) => (
                    <FormItem className="space-y-3">
                        <FormLabel>Tipo de Local</FormLabel>
                        <FormControl>
                            <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-col md:flex-row gap-4"
                            >
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                        <RadioGroupItem value="casa" />
                                    </FormControl>
                                    <FormLabel className="font-normal">Casa</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                        <RadioGroupItem value="apartamento" />
                                    </FormControl>
                                    <FormLabel className="font-normal">Apartamento</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                        <RadioGroupItem value="sobrado" />
                                    </FormControl>
                                    <FormLabel className="font-normal">Sobrado</FormLabel>
                                </FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <FormField
                    control={control}
                    name={`${nestName}.floor`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Andar</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o andar" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {floorOptions.map(floor => (
                                        <SelectItem key={floor} value={floor}>
                                            {floor === 'Térreo' ? 'Térreo' : `${floor}° Andar`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 {!isTerreo && (
                     <FormField
                        control={control}
                        name={`${nestName}.accessType`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Acesso ao Local</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o acesso" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="elevador">Elevador</SelectItem>
                                        <SelectItem value="escada">Escada</SelectItem>
                                        <SelectItem value="rampa">Rampa</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                 )}
            </div>
             <FormField
                control={control}
                name={`${nestName}.distance`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Distância para carga/descarga (metros)</FormLabel>
                         <FormDescription>Qual a distância em metros entre o local do frete e onde o veículo pode parar?</FormDescription>
                        <FormControl>
                            <Input 
                                placeholder="Ex: 20" 
                                {...field} 
                                onChange={(e) => handleDistanceChange(e, field)}
                                value={field.value}
                                inputMode="numeric"
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {showDateTime && (
                 <FormField
                    control={control}
                    name={`${nestName}.dateTime`}
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Data e Hora de Carregamento</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                )}
                                >
                                {field.value ? (
                                    format(field.value, "PPP 'às' HH:mm", { locale: ptBR })
                                ) : (
                                    <span>Escolha uma data e hora</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                                initialFocus
                            />
                            <div className="p-2 border-t border-border">
                                <p className="text-sm text-center text-muted-foreground">Selecione o horário</p>
                                <Controller
                                    control={control}
                                    name={`${nestName}.dateTime`}
                                    render={({field: timeField}) => (
                                        <div className="flex items-center gap-2 mt-2">
                                             <Input type="time"
                                                defaultValue={timeField.value ? format(timeField.value, 'HH:mm') : ''}
                                                onChange={(e) => {
                                                    const newDate = timeField.value || new Date();
                                                    const [hours, minutes] = e.target.value.split(':');
                                                    newDate.setHours(parseInt(hours), parseInt(minutes));
                                                    timeField.onChange(newDate);
                                                }}
                                            />
                                        </div>
                                    )}
                                />
                            </div>
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            )}
        </div>
    )
}


function OriginStep() {
    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-semibold">1. Detalhes da Origem</h2>
            <p className="text-muted-foreground">Onde o frete será carregado?</p>
            <Separator />
            <LocationFormFields nestName="origin" showDateTime={true} />
        </div>
    )
}

function DestinationStep() {
     const { control, getValues, setValue } = useFormContext();
     const { fields, append, remove } = useFieldArray({
         control,
         name: "destinations"
     });
     
     const { toast } = useToast();

     const copyOriginAddress = (destinationIndex: number) => {
        const originValues = getValues("origin");
        if (originValues.state && originValues.city) {
            setValue(`destinations.${destinationIndex}.state`, originValues.state, { shouldValidate: true, shouldDirty: true });
            
            // Wait a bit for the city list to update based on the new state
            setTimeout(() => {
                setValue(`destinations.${destinationIndex}.city`, originValues.city, { shouldValidate: true, shouldDirty: true });
                toast({ title: "Endereço copiado!", description: "O estado e a cidade da origem foram copiados." });
            }, 1);

        } else {
             toast({ variant: "destructive", title: "Atenção", description: "Preencha o estado e a cidade na origem primeiro." });
        }
     }

     return (
        <div className="space-y-6">
            <h2 className="text-2xl font-semibold">2. Destino(s)</h2>
            <p className="text-muted-foreground">Para onde vamos levar? Adicione um ou mais destinos.</p>
            <Separator />
            <div className="space-y-8">
                {fields.map((field, index) => (
                    <Card key={field.id} className="bg-muted/30">
                        <CardContent className="p-4 md:p-6">
                            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                                <h3 className="font-semibold text-lg">Destino {index + 1}</h3>
                                <div className='flex items-center gap-2'>
                                    <Button type="button" variant="outline" size="sm" onClick={() => copyOriginAddress(index)}>
                                        <Copy className="mr-2 h-4 w-4"/>
                                        Usar dados da origem
                                    </Button>
                                    {fields.length > 1 && (
                                         <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <LocationFormFields nestName={`destinations.${index}`} />
                        </CardContent>
                    </Card>
                ))}
            </div>
             <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => append({ 
                    state: '', city: '', neighborhood: '', locationType: 'casa', floor: 'Térreo', distance: ''
                })}
            >
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar outro destino
            </Button>
        </div>
    )
}

function ItemsStep() {
    const { control } = useFormContext();
    const { fields, append, remove } = useFieldArray({
        control,
        name: "items.list"
    });

    const itemsType = useWatch({ control, name: "items.type" });

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-semibold">3. Itens a Transportar</h2>
            <p className="text-muted-foreground">O que será transportado? Escolha uma das opções abaixo.</p>
            <Separator />
            
            <FormField
                control={control}
                name="items.type"
                render={({ field }) => (
                    <FormItem className="space-y-3">
                        <FormControl>
                            <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-col md:flex-row gap-4"
                            >
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                        <RadioGroupItem value="description" />
                                    </FormControl>
                                    <FormLabel className="font-normal">Descrição Livre</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                        <RadioGroupItem value="list" />
                                    </FormControl>
                                    <FormLabel className="font-normal">Lista de Itens</FormLabel>
                                </FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {itemsType === 'description' && (
                <FormField
                    control={control}
                    name="items.description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Descreva os itens</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Ex: 1 geladeira, 1 sofá de 3 lugares, 10 caixas médias..."
                                    className="min-h-[120px]"
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}

            {itemsType === 'list' && (
                <div className="space-y-4">
                     <FormLabel>Liste os itens um por um</FormLabel>
                    {fields.map((field, index) => (
                        <div key={field.id} className="flex items-center gap-2">
                             <FormField
                                control={control}
                                name={`items.list.${index}.value`}
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormControl>
                                            <Input placeholder={`Item #${index + 1}`} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    ))}
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => append({ value: "" })}
                    >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Adicionar Item
                    </Button>
                </div>
            )}
        </div>
    );
}

function ConditionalListInput({ controlName, switchName, label, placeholder }: { controlName: string, switchName: string, label: string, placeholder: string }) {
    const { control } = useFormContext();
    const { fields, append, remove } = useFieldArray({ control, name: controlName });
    const switchValue = useWatch({ control, name: switchName });

    if (!switchValue) return null;

    return (
        <div className="space-y-4 pl-4 border-l-2 ml-2">
            <FormLabel>{label}</FormLabel>
            {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                    <FormField
                        control={control}
                        name={`${controlName}.${index}.value`}
                        render={({ field: itemField }) => (
                            <FormItem className="flex-1">
                                <FormControl>
                                    <Input placeholder={`${placeholder} #${index + 1}`} {...itemField} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
            ))}
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ value: "" })}
            >
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar
            </Button>
        </div>
    );
}

function AdditionalInfoStep() {
    const { control } = useFormContext();
    const watchHasRestriction = useWatch({ control, name: 'additionalInfo.hasRestriction' });
    const watchHasSchedulePreference = useWatch({ control, name: 'additionalInfo.hasSchedulePreference' });
    const watchHasParkingRestriction = useWatch({ control, name: 'additionalInfo.hasParkingRestriction' });

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-semibold">4. Informações Adicionais</h2>
            <p className="text-muted-foreground">Forneça detalhes extras para um orçamento mais preciso.</p>
            <Separator />

            <div className="space-y-6">
                <FormField
                    control={control}
                    name="additionalInfo.hasRestriction"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel>O local possui alguma restrição?</FormLabel>
                            </div>
                            <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                        </FormItem>
                    )}
                />
                {watchHasRestriction && (
                     <FormField
                        control={control}
                        name="additionalInfo.restrictionDetails"
                        render={({ field }) => (
                             <FormItem className="pl-4 border-l-2 ml-2">
                                <FormLabel>Qual?</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Ex: Proibido barulho após as 22h, elevador não pode ser usado para mudanças..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
            </div>

            <div className="space-y-2">
                <FormField
                    control={control}
                    name="additionalInfo.needsAssembly"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel>Necessita desmontagem/montagem?</FormLabel>
                            </div>
                            <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                        </FormItem>
                    )}
                />
                <ConditionalListInput 
                    controlName="additionalInfo.assemblyItems"
                    switchName="additionalInfo.needsAssembly"
                    label="Quais móveis?"
                    placeholder="Ex: Guarda-roupa"
                />
                 <FormField control={control} name="additionalInfo.assemblyItems" render={() => <FormMessage />} />
            </div>

            <div className="space-y-2">
                 <FormField
                    control={control}
                    name="additionalInfo.needsPackaging"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel>Precisa que a empresa embale algum móvel?</FormLabel>
                            </div>
                            <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                        </FormItem>
                    )}
                />
                <ConditionalListInput 
                    controlName="additionalInfo.packagingItems"
                    switchName="additionalInfo.needsPackaging"
                    label="Quais móveis?"
                    placeholder="Ex: Sofá, TV 55 polegadas"
                />
                <FormField control={control} name="additionalInfo.packagingItems" render={() => <FormMessage />} />
            </div>

            <div className="space-y-6">
                <FormField
                    control={control}
                    name="additionalInfo.hasSchedulePreference"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel>Existe horário preferencial para a mudança?</FormLabel>
                            </div>
                            <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                        </FormItem>
                    )}
                />
                {watchHasSchedulePreference && (
                     <FormField
                        control={control}
                        name="additionalInfo.scheduleDetails"
                        render={({ field }) => (
                             <FormItem className="pl-4 border-l-2 ml-2">
                                <FormLabel>Qual o horário?</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ex: Somente no período da manhã" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
            </div>

             <div className="space-y-6">
                <FormField
                    control={control}
                    name="additionalInfo.hasParkingRestriction"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel>Há restrição/taxa para estacionar?</FormLabel>
                            </div>
                            <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                        </FormItem>
                    )}
                />
                {watchHasParkingRestriction && (
                     <FormField
                        control={control}
                        name="additionalInfo.parkingRestrictionDetails"
                        render={({ field }) => (
                             <FormItem className="pl-4 border-l-2 ml-2">
                                <FormLabel>Qual?</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Ex: Zona Azul, condomínio cobra taxa de R$50,00" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
            </div>
             <div className="space-y-2">
                 <FormField
                    control={control}
                    name="additionalInfo.needsStorage"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel>Precisa de guarda-móveis?</FormLabel>
                                <FormDescription>Armazenamento temporário dos itens.</FormDescription>
                            </div>
                            <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                        </FormItem>
                    )}
                />
            </div>

            <div className="space-y-2">
                 <FormField
                    control={control}
                    name="additionalInfo.needsItemPackaging"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel>Precisa que a empresa embale outros itens?</FormLabel>
                                <FormDescription>Roupas, utensílios, etc.</FormDescription>
                            </div>
                            <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                        </FormItem>
                    )}
                />
                <ConditionalListInput 
                    controlName="additionalInfo.itemPackagingDetails"
                    switchName="additionalInfo.needsItemPackaging"
                    label="Quais itens?"
                    placeholder="Ex: Roupas de cama"
                />
                 <FormField control={control} name="additionalInfo.itemPackagingDetails" render={() => <FormMessage />} />
            </div>
            
            <Separator />

             <FormField
                control={control}
                name="additionalInfo.companyPreference"
                render={({ field }) => (
                    <FormItem className="space-y-3">
                        <FormLabel>Na escolha da empresa, você vai dar preferência a:</FormLabel>
                        <FormControl>
                            <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-col gap-2"
                            >
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                        <RadioGroupItem value="price" />
                                    </FormControl>
                                    <FormLabel className="font-normal">Preço (o mais barato)</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                        <RadioGroupItem value="quality" />
                                    </FormControl>
                                    <FormLabel className="font-normal">Qualidade (a mais bem avaliada)</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                        <RadioGroupItem value="cost_benefit" />
                                    </FormControl>
                                    <FormLabel className="font-normal">Custo/Benefício (equilíbrio entre preço e qualidade)</FormLabel>
                                </FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    )
}

function ContactStep() {
    const { control } = useFormContext();
    const phoneType = useWatch({ control, name: 'contact.phoneType' });

    const formatPhoneNumber = (value: string) => {
        if (!value) return '';
        const numbers = value.replace(/\D/g, '');
        if (phoneType === 'whatsapp') {
            if (numbers.length > 10) {
                 return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
            }
        }
        if (numbers.length > 6) {
             return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6, 10)}`;
        }
         if (numbers.length > 2) {
            return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
        }
        return numbers;
    };
    
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>, field: any) => {
        const rawValue = e.target.value;
        const maxLength = phoneType === 'whatsapp' ? 11 : 10;
        if (rawValue.replace(/\D/g, '').length <= maxLength) {
            field.onChange(rawValue);
        }
    }


    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-semibold">5. Informações de Contato</h2>
            <p className="text-muted-foreground">Para quem enviaremos os orçamentos?</p>
            <Separator />

             <FormField
                control={control}
                name="contact.phoneType"
                render={({ field }) => (
                    <FormItem className="space-y-3">
                        <FormLabel>O telefone principal é:</FormLabel>
                        <FormControl>
                            <RadioGroup
                                onValueChange={(value) => {
                                    field.onChange(value);
                                }}
                                defaultValue={field.value}
                                className="flex gap-4"
                            >
                                <FormItem className="flex items-center space-x-2">
                                    <FormControl><RadioGroupItem value="whatsapp" /></FormControl>
                                    <FormLabel className="font-normal">WhatsApp</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2">
                                    <FormControl><RadioGroupItem value="fixo" /></FormControl>
                                    <FormLabel className="font-normal">Fixo</FormLabel>
                                </FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={control}
                name="contact.fullName"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl><Input placeholder="Digite seu nome completo" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <div className="grid md:grid-cols-2 gap-6">
                <FormField
                    control={control}
                    name="contact.phone"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Telefone com DDD</FormLabel>
                            <FormControl>
                                <Input 
                                    placeholder={phoneType === 'whatsapp' ? "(XX) XXXXX-XXXX" : "(XX) XXXX-XXXX"} 
                                    {...field}
                                    onChange={(e) => handlePhoneChange(e, field)}
                                    value={formatPhoneNumber(field.value || '')}
                                    inputMode="numeric"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={control}
                    name="contact.confirmPhone"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Confirme seu Telefone</FormLabel>
                            <FormControl>
                                <Input 
                                    placeholder="Repita o telefone" 
                                    {...field}
                                     onChange={(e) => handlePhoneChange(e, field)}
                                     value={formatPhoneNumber(field.value || '')}
                                     inputMode="numeric"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
             <FormField
                control={control}
                name="contact.email"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl><Input type="email" placeholder="seu.melhor@email.com" {...field} /></FormControl>
                         <FormDescription>Usaremos este e-mail para enviar as propostas.</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    )
}

function SummaryView({ data }: { data: FormData }) {
    const { origin, destinations, items, additionalInfo, contact } = data;

    const renderList = (list: {value: string}[] | undefined) => (
        <ul className="list-disc list-inside text-sm">
            {list?.map((item, index) => <li key={index}>{item.value}</li>)}
        </ul>
    );

    return (
        <div className="space-y-6 text-sm max-h-[60vh] overflow-y-auto pr-4">
            {/* Contato */}
            <div className="space-y-1">
                <h3 className="font-semibold text-base">Seus Dados</h3>
                <p><strong>Nome:</strong> {contact.fullName}</p>
                <p><strong>Email:</strong> {contact.email}</p>
                <p><strong>Telefone:</strong> {contact.phone} ({contact.phoneType})</p>
            </div>
            <Separator />
            {/* Origem */}
            <div className="space-y-1">
                <h3 className="font-semibold text-base">Origem</h3>
                <p><strong>Local:</strong> {origin.city}, {origin.state} (Bairro: {origin.neighborhood})</p>
                <p><strong>Data:</strong> {origin.dateTime ? format(origin.dateTime, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'N/A'}</p>
                <p><strong>Detalhes:</strong> {origin.locationType}, {origin.floor}, Acesso por {origin.accessType || 'N/A'}, Dist. {origin.distance}m</p>
            </div>
            <Separator />
            {/* Destinos */}
            <div>
                <h3 className="font-semibold text-base mb-1">Destinos</h3>
                {destinations.map((dest, index) => (
                    <div key={index} className="space-y-1 p-2 border-b last:border-b-0">
                         <p><strong>Destino {index+1}:</strong> {dest.city}, {dest.state} (Bairro: {dest.neighborhood})</p>
                         <p><strong>Detalhes:</strong> {dest.locationType}, {dest.floor}, Acesso por {dest.accessType || 'N/A'}, Dist. {dest.distance}m</p>
                    </div>
                ))}
            </div>
            <Separator />
             {/* Itens */}
            <div className="space-y-1">
                 <h3 className="font-semibold text-base">Itens a Transportar</h3>
                 {items.type === 'description' ? <p>{items.description}</p> : renderList(items.list)}
            </div>
            <Separator />
            {/* Adicionais */}
             <div className="space-y-1">
                <h3 className="font-semibold text-base">Informações Adicionais</h3>
                <p><strong>Restrição no local?</strong> {additionalInfo.hasRestriction ? `Sim - ${additionalInfo.restrictionDetails}` : 'Não'}</p>
                <p><strong>Montagem/Desmontagem?</strong> {additionalInfo.needsAssembly ? 'Sim' : 'Não'}</p>
                {additionalInfo.needsAssembly && renderList(additionalInfo.assemblyItems)}
                <p><strong>Embalar móveis?</strong> {additionalInfo.needsPackaging ? 'Sim' : 'Não'}</p>
                {additionalInfo.needsPackaging && renderList(additionalInfo.packagingItems)}
                <p><strong>Preferência de horário?</strong> {additionalInfo.hasSchedulePreference ? `Sim - ${additionalInfo.scheduleDetails}` : 'Não'}</p>
                <p><strong>Restrição de estacionamento?</strong> {additionalInfo.hasParkingRestriction ? `Sim - ${additionalInfo.parkingRestrictionDetails}` : 'Não'}</p>
                <p><strong>Guarda-móveis?</strong> {additionalInfo.needsStorage ? 'Sim' : 'Não'}</p>
                <p><strong>Embalar outros itens?</strong> {additionalInfo.needsItemPackaging ? 'Sim' : 'Não'}</p>
                {additionalInfo.needsItemPackaging && renderList(additionalInfo.itemPackagingDetails)}
                <p><strong>Preferência na escolha:</strong> {additionalInfo.companyPreference}</p>
            </div>
        </div>
    );
}


// =================================================================
// Componente Principal da Página
// =================================================================

export default function RequestFreightPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [freightId, setFreightId] = useState('');
  const { toast } = useToast();
  const router = useRouter();

  const methods = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    defaultValues: {
        origin: {
            state: '',
            city: '',
            neighborhood: '',
            locationType: 'casa',
            floor: 'Térreo',
            distance: '',
        },
        destinations: [{ state: '', city: '', neighborhood: '', locationType: 'casa', floor: 'Térreo', distance: '' }],
        items: {
            type: 'description',
            description: '',
            list: []
        },
        additionalInfo: {
            hasRestriction: false,
            restrictionDetails: '',
            needsAssembly: false,
            assemblyItems: [],
            needsPackaging: false,
            packagingItems: [],
            hasSchedulePreference: false,
            scheduleDetails: '',
            hasParkingRestriction: false,
            parkingRestrictionDetails: '',
            needsStorage: false,
            needsItemPackaging: false,
            itemPackagingDetails: [],
            companyPreference: 'cost_benefit',
        },
        contact: {
            phoneType: 'whatsapp',
            fullName: '',
            phone: '',
            confirmPhone: '',
            email: '',
        }
    }
  });

  const { handleSubmit, trigger, getValues, formState: { isSubmitting } } = methods;

  async function processForm(data: FormData) {
     const generatedId = generateFreightId();
     setFreightId(generatedId);
     try {
        // Deep copy and remove circular references for Firestore
        const dataToSave = JSON.parse(JSON.stringify(data));
        
        const freightData = {
            ...dataToSave,
            id: generatedId,
            freightType: 'comum',
            status: 'ativo',
            createdAt: serverTimestamp(),
            origin: `${dataToSave.origin.city}, ${dataToSave.origin.state}`,
            destinations: dataToSave.destinations.map((d: any) => `${d.city}, ${d.state}`),
            companyId: 'unauthenticated', // For anonymous requests
            companyName: dataToSave.contact.fullName,
        };

        // Remove confirmation phone from data to be saved
        if (freightData.contact?.confirmPhone) {
            delete (freightData.contact as any).confirmPhone;
        }

        await addDoc(collection(db, 'freights'), freightData);
        setIsSummaryOpen(false);
        setIsSuccessOpen(true);
    } catch(error) {
        console.error("Error saving freight request: ", error);
        toast({
            variant: "destructive",
            title: "Erro ao Enviar",
            description: "Não foi possível salvar sua solicitação. Tente novamente."
        })
        setIsSummaryOpen(false);
    }
  }
  
  type FieldName = keyof FormData | ('origin' | 'destinations' | 'items' | 'additionalInfo' | 'contact')[];

  const nextStep = async () => {
    const fields = steps[currentStep].fields as FieldName;
    const output = await trigger(fields, { shouldFocus: true });

    if (!output) return;

    if (currentStep < steps.length - 1) {
      setCurrentStep(step => step + 1);
      window.scrollTo(0, 0);
    } else {
        setIsSummaryOpen(true);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(step => step - 1);
       window.scrollTo(0, 0);
    }
  };

  const handleFinish = () => {
    setIsSuccessOpen(false);
    router.push('/');
  }
  
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <section className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold font-headline text-primary">Solicitar um Frete</h1>
                <p className="mt-2 text-lg text-foreground/70">
                    Preencha o formulário abaixo em poucas etapas para receber um orçamento.
                </p>
            </div>
            
            <Card className="shadow-lg">
                <CardContent className="p-6 md:p-8">
                    <div className="mb-8">
                        <p className="text-sm text-muted-foreground">Etapa {currentStep + 1} de {steps.length}: {steps[currentStep].name}</p>
                        <Progress value={progress} className="mt-2" />
                    </div>
                
                    <FormProvider {...methods}>
                        <form onSubmit={handleSubmit(() => setIsSummaryOpen(true))}>
                            <div className={currentStep === 0 ? 'block' : 'hidden'}> <OriginStep /> </div>
                            <div className={currentStep === 1 ? 'block' : 'hidden'}> <DestinationStep /> </div>
                            <div className={currentStep === 2 ? 'block' : 'hidden'}> <ItemsStep /> </div>
                            <div className={currentStep === 3 ? 'block' : 'hidden'}> <AdditionalInfoStep /> </div>
                            <div className={currentStep === 4 ? 'block' : 'hidden'}> <ContactStep /> </div>
                        </form>
                    </FormProvider>

                    {/* Modal de Confirmação */}
                    <Dialog open={isSummaryOpen} onOpenChange={setIsSummaryOpen}>
                        <DialogContent className="sm:max-w-2xl">
                             <DialogHeader>
                                <DialogTitle className="text-2xl">Confirme sua Solicitação</DialogTitle>
                                <p className="text-sm text-muted-foreground">
                                    Por favor, revise todos os dados antes de finalizar.
                                </p>
                             </DialogHeader>
                             <SummaryView data={getValues()} />
                             <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="secondary">Cancelar</Button>
                                </DialogClose>
                                <Button onClick={handleSubmit(processForm)} disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Finalizar
                                </Button>
                             </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Modal de Sucesso */}
                    <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
                        <DialogContent>
                             <DialogHeader>
                                <div className="flex flex-col items-center text-center gap-4 py-4">
                                    <CheckCircle className="h-16 w-16 text-green-500" />
                                    <DialogTitle className="text-2xl">Parabéns!</DialogTitle>
                                    <p className="text-muted-foreground">Seu pedido foi feito com sucesso e em breve você começará a receber os primeiros orçamentos.</p>
                                    <div className="bg-muted rounded-md p-3 w-full text-center mt-2">
                                        <p className="text-sm">Código do Pedido:</p>
                                        <p className="font-mono font-bold text-lg text-primary">{freightId}</p>
                                    </div>
                                </div>
                             </DialogHeader>
                             <DialogFooter>
                                <Button onClick={handleFinish} className="w-full">
                                    Fechar
                                </Button>
                             </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <div className="mt-8 flex justify-between">
                        <Button onClick={prevStep} variant="outline" disabled={currentStep === 0 || isSubmitting}>
                            Voltar
                        </Button>
                        <Button onClick={nextStep} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {currentStep < steps.length - 1 ? 'Próximo' : 'Revisar e Enviar'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    </section>
  );
}
