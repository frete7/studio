
'use client';

import { useState } from 'react';
import { useForm, FormProvider, useFormContext, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from "date-fns";
import { ptBR } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarIcon, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

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
    distance: z.string().min(1, "Distância é obrigatória"),
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
    type: z.enum(['description', 'list']),
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
    message: "Forneça uma descrição ou adicione pelo menos um item à lista.",
    path: ['description'],
});

const additionalInfoSchema = z.object({
    hasRestriction: z.boolean().default(false),
    needsAssembly: z.boolean().default(false),
    assemblyItems: z.array(z.object({ value: z.string() })).optional(),
    needsPackaging: z.boolean().default(false),
    packagingItems: z.array(z.object({ value: z.string() })).optional(),
});


const formSchema = z.object({
  origin: originSchema,
  destinations: z.array(locationSchema).min(1, "Adicione pelo menos um destino."),
  items: itemsSchema,
  additionalInfo: additionalInfoSchema,
});

type FormData = z.infer<typeof formSchema>;

const steps = [
  { id: 1, name: 'Origem', fields: ['origin'] },
  { id: 2, name: 'Destino(s)', fields: ['destinations'] },
  { id: 3, name: 'Itens', fields: ['items'] },
  { id: 4, name: 'Detalhes Finais', fields: ['additionalInfo'] },
];


// =================================================================
// Componentes das Etapas
// =================================================================

function LocationFormFields({ nestName, showDateTime = false }: { nestName: string, showDateTime?: boolean }) {
    const { control, watch } = useFormContext();
    const floorValue = watch(`${nestName}.floor`);
    const isTerreo = floorValue === 'Térreo';

    const floorOptions = ['Térreo', ...Array.from({ length: 95 }, (_, i) => (i - 5).toString()).reverse()];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={control}
                    name={`${nestName}.state`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Estado (UF)</FormLabel>
                            <FormControl>
                                <Input placeholder="Ex: SP" {...field} />
                            </FormControl>
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
                            <FormControl>
                                <Input placeholder="Ex: São Paulo" {...field} />
                            </FormControl>
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
                            <Input placeholder="Ex: Vila Madalena" {...field} />
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
                                        <SelectItem key={floor} value={floor}>{floor}</SelectItem>
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
                        <FormLabel>Distância para carga/descarga</FormLabel>
                         <FormDescription>Qual a distância entre o local do frete e onde o veículo pode parar?</FormDescription>
                        <FormControl>
                            <Input placeholder="Ex: 20 metros" {...field} />
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
     const { control } = useFormContext();
     const { fields, append, remove } = useFieldArray({
         control,
         name: "destinations"
     });

     return (
        <div className="space-y-6">
            <h2 className="text-2xl font-semibold">2. Destino(s)</h2>
            <p className="text-muted-foreground">Para onde vamos levar? Adicione um ou mais destinos.</p>
            <Separator />
            <div className="space-y-8">
                {fields.map((field, index) => (
                    <Card key={field.id} className="bg-muted/30">
                        <CardContent className="p-4 md:p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-lg">Destino {index + 1}</h3>
                                {fields.length > 1 && (
                                     <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                )}
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
     return (
        <div className="space-y-4">
            <h2 className="text-2xl font-semibold">3. Itens a Transportar</h2>
            <p className="text-muted-foreground">O que será transportado?</p>
            <Separator />
            <div className="p-4 border rounded-md bg-muted/50 text-center">
                <p>Campos do formulário da Etapa 3 aparecerão aqui.</p>
            </div>
        </div>
    )
}
function AdditionalInfoStep() {
     return (
        <div className="space-y-4">
            <h2 className="text-2xl font-semibold">4. Informações Adicionais</h2>
            <p className="text-muted-foreground">Algum detalhe extra importante?</p>
            <Separator />
            <div className="p-4 border rounded-md bg-muted/50 text-center">
                <p>Campos do formulário da Etapa 4 aparecerão aqui.</p>
            </div>
        </div>
    )
}

// =================================================================
// Componente Principal da Página
// =================================================================

export default function RequestFreightPage() {
  const [currentStep, setCurrentStep] = useState(0);
  
  const methods = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        origin: {
            dateTime: new Date(new Date().setDate(new Date().getDate() + 1))
        },
        destinations: [{ state: '', city: '', neighborhood: '', locationType: 'casa', floor: 'Térreo', distance: '' }],
        items: {
            type: 'description',
            description: '',
            list: []
        },
        additionalInfo: {
            hasRestriction: false,
            needsAssembly: false,
            assemblyItems: [],
            needsPackaging: false,
            packagingItems: []
        }
    }
  });

  const { handleSubmit, trigger, formState: { isSubmitting } } = methods;

  async function processForm(data: FormData) {
    console.log('Form data:', data);
    // Simular envio
    await new Promise(resolve => setTimeout(resolve, 2000));
    alert('Frete solicitado com sucesso!');
  }
  
  const nextStep = async () => {
    const fields = steps[currentStep].fields;
    // @ts-ignore
    const output = await trigger(fields, { shouldFocus: true });

    if (!output) return;

    if (currentStep < steps.length - 1) {
      setCurrentStep(step => step + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(step => step - 1);
    }
  };
  
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
                        <form onSubmit={handleSubmit(processForm)}>
                            <div>
                                {currentStep === 0 && <OriginStep />}
                                {currentStep === 1 && <DestinationStep />}
                                {currentStep === 2 && <ItemsStep />}
                                {currentStep === 3 && <AdditionalInfoStep />}
                            </div>
                        </form>
                    </FormProvider>

                    <div className="mt-8 flex justify-between">
                        <Button onClick={prevStep} variant="outline" disabled={currentStep === 0 || isSubmitting}>
                            Voltar
                        </Button>
                        {currentStep < steps.length - 1 ? (
                            <Button onClick={nextStep} disabled={isSubmitting}>
                                Próximo
                            </Button>
                        ) : (
                            <Button onClick={handleSubmit(processForm)} disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Enviar Solicitação
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    </section>
  );
}

