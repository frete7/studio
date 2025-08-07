
'use client';

import { useState, useEffect } from 'react';
import { useForm, FormProvider, useFormContext, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

import { type Collaborator } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, User, Search, PlusCircle, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';

// =================================================================
// Schemas e Tipos
// =================================================================

const locationSchema = z.object({
  state: z.string().min(1, "O estado é obrigatório."),
  city: z.string().min(1, "A cidade é obrigatória."),
});

const orderDetailsSchema = z.object({
    whatWillBeLoaded: z.string().min(3, "Este campo é obrigatório."),
    whoPaysToll: z.enum(['empresa', 'motorista'], { required_error: "Selecione quem paga o pedágio." }),
    tollTripScope: z.enum(['apenas_ida', 'apenas_volta', 'ida_e_volta']).optional(),
    needsTracker: z.boolean().default(false),
    trackerType: z.string().optional(),
    cargoType: z.enum(['paletizado', 'granel', 'caixas', 'sacos', 'outros'], { required_error: "Selecione o tipo de carga." }),
    isDangerousCargo: z.boolean().default(false),
    driverNeedsToHelp: z.boolean().default(false),
    driverHelpScope: z.enum(['apenas_carregamento', 'apenas_descarregamento', 'carga_e_descarga']).optional(),
    needsHelper: z.boolean().default(false),
    whoPaysHelper: z.enum(['empresa', 'motorista']).optional(),
    hasInvoice: z.boolean().default(false),
    driverNeedsToIssueInvoice: z.boolean().default(false),
    driverNeedsANTT: z.boolean().default(false),
    needsSpecificCourses: z.boolean().default(false),
    specificCourses: z.array(z.object({ value: z.string().min(1, "O nome do curso não pode ser vazio.") })).optional(),
    minimumVehicleAge: z.string().optional(),
    paymentMethods: z.string().optional(),
    benefits: z.array(z.object({ value: z.string().min(1, "O benefício não pode ser vazio.") })).optional(),
}).refine(data => data.whoPaysToll ? data.tollTripScope : true, {
    message: "Selecione o trecho do pedágio.",
    path: ['tollTripScope'],
}).refine(data => !data.needsTracker || (data.trackerType && data.trackerType.length > 0), {
    message: "Especifique o tipo de rastreador.",
    path: ['trackerType'],
}).refine(data => !data.driverNeedsToHelp || data.driverHelpScope, {
    message: "Selecione quando o motorista precisa ajudar.",
    path: ['driverHelpScope'],
}).refine(data => !data.needsHelper || data.whoPaysHelper, {
    message: "Selecione quem paga pelo ajudante.",
    path: ['whoPaysHelper'],
}).refine(data => !data.needsSpecificCourses || (data.specificCourses && data.specificCourses.length > 0), {
    message: "Adicione pelo menos um curso.",
    path: ['specificCourses'],
});


const formSchema = z.object({
  responsibleCollaborators: z.array(z.string()).refine(value => value.some(item => item), {
    message: "Você deve selecionar pelo menos um colaborador.",
  }),
  origin: locationSchema,
  destinations: z.array(locationSchema).min(1, "Adicione pelo menos um destino."),
  orderDetails: orderDetailsSchema,
  // Outras etapas virão aqui
});

type FormData = z.infer<typeof formSchema>;
type IBGEState = { id: number; sigla: string; nome: string; };
type IBGECity = { id: number; nome: string; };

const steps = [
  { id: 1, name: 'Responsáveis', fields: ['responsibleCollaborators'] },
  { id: 2, name: 'Rota', fields: ['origin', 'destinations'] },
  { id: 3, name: 'Informações do Pedido', fields: ['orderDetails'] },
  { id: 4, name: 'Requisitos Adicionais', fields: [] },
];

// =================================================================
// Componentes das Etapas
// =================================================================

function StepCollaborators({ companyId }: { companyId: string }) {
  const { control } = useFormContext();
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (!companyId) {
        setIsLoading(false);
        return;
    };
    
    const collaboratorsCollection = collection(db, 'users', companyId, 'collaborators');
    const q = query(collaboratorsCollection);

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Collaborator));
        setCollaborators(data);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching collaborators: ", error);
        toast({
            variant: "destructive",
            title: "Erro ao buscar colaboradores",
            description: "Não foi possível carregar a lista de colaboradores."
        });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [companyId, toast]);

  const filteredCollaborators = collaborators.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">1. Colaboradores Responsáveis</h2>
      <p className="text-muted-foreground">Selecione quem serão os contatos principais para esta solicitação de agregamento. Você pode escolher mais de um.</p>
      <Separator />

       <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar colaborador..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
      </div>

      <FormField
        control={control}
        name="responsibleCollaborators"
        render={() => (
          <FormItem>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {isLoading ? (
                    <div className="flex justify-center items-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                    </div>
                ) : filteredCollaborators.length > 0 ? (
                    filteredCollaborators.map((item) => (
                        <FormField
                            key={item.id}
                            control={control}
                            name="responsibleCollaborators"
                            render={({ field }) => {
                                return (
                                <FormItem
                                    key={item.id}
                                    className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"
                                >
                                    <FormControl>
                                    <Checkbox
                                        checked={field.value?.includes(item.id)}
                                        onCheckedChange={(checked) => {
                                        return checked
                                            ? field.onChange([...(field.value || []), item.id])
                                            : field.onChange(
                                                field.value?.filter(
                                                (value) => value !== item.id
                                                )
                                            )
                                        }}
                                    />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel className="font-medium cursor-pointer">
                                            {item.name}
                                        </FormLabel>
                                        <p className="text-sm text-muted-foreground">{item.department}</p>
                                    </div>
                                </FormItem>
                                )
                            }}
                        />
                    ))
                ) : (
                    <p className="text-center text-muted-foreground py-10">Nenhum colaborador encontrado.</p>
                )}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

function LocationSelector({ nestName, label }: { nestName: string, label: string }) {
    const { control, watch, setValue } = useFormContext();
    
    const [states, setStates] = useState<IBGEState[]>([]);
    const [cities, setCities] = useState<IBGECity[]>([]);
    const [isLoadingStates, setIsLoadingStates] = useState(false);
    const [isLoadingCities, setIsLoadingCities] = useState(false);

    const selectedState = watch(`${nestName}.state`);

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
            setValue(`${nestName}.city`, '', { shouldValidate: true });
            fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedState}/municipios?orderBy=nome`)
                .then(res => res.json())
                .then(data => {
                    setCities(data);
                    setIsLoadingCities(false);
                });
        }
    }, [selectedState, nestName, setValue]);

    return (
        <div className="space-y-4">
            <p className="font-medium">{label}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    control={control}
                    name={`${nestName}.state`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Estado (UF)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingStates}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder={isLoadingStates ? "Carregando..." : "Selecione"} />
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
                                        <SelectValue placeholder={isLoadingCities ? "Carregando..." : "Selecione"} />
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
        </div>
    );
}


function StepRoute() {
    const { control, formState: { errors } } = useFormContext();
    const { fields, append, remove } = useFieldArray({
        control,
        name: "destinations",
    });

    const allDestinations = useWatch({ control, name: "destinations" });
    const lastDestination = allDestinations[allDestinations.length - 1];
    const isAddDisabled = !lastDestination || !lastDestination.state || !lastDestination.city;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-semibold">2. Rota do Agregamento</h2>
            <p className="text-muted-foreground">Defina a origem e os destinos que farão parte desta operação.</p>
            <Separator />
            
            <LocationSelector nestName="origin" label="Ponto de Origem" />

            <Separator />

            <div className="space-y-4">
                 <h3 className="text-lg font-semibold">Destinos</h3>
                 <div className="space-y-6">
                    {fields.map((field, index) => (
                        <Card key={field.id} className="p-4 bg-muted/30">
                            <div className="flex justify-between items-center mb-2">
                                <FormLabel>Destino {index + 1}</FormLabel>
                                {fields.length > 1 && (
                                     <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                )}
                            </div>
                            <LocationSelector nestName={`destinations.${index}`} label="" />
                        </Card>
                    ))}
                 </div>
                 <Button
                    type="button"
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => append({ state: '', city: '' })}
                    disabled={isAddDisabled}
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar outro destino
                </Button>
                {isAddDisabled && <p className="text-center text-muted-foreground text-sm mt-2">Preencha o destino atual para adicionar um novo.</p>}
                 <FormField control={control} name="destinations" render={() => <FormMessage className="text-center" />} />
            </div>
        </div>
    );
}

function ConditionalListInput({ controlName, switchName, label, placeholder }: { controlName: string, switchName?: string, label: string, placeholder: string }) {
    const { control } = useFormContext();
    const { fields, append, remove } = useFieldArray({ control, name: controlName });
    const switchValue = switchName ? useWatch({ control, name: switchName }) : true;

    if (!switchValue) return null;

    const containerClass = switchName ? "pl-4 border-l-2 ml-2" : "";

    return (
        <div className={`space-y-4 ${containerClass}`}>
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
            <FormField control={control} name={controlName} render={({fieldState}) => <FormMessage>{fieldState.error?.message}</FormMessage>} />
        </div>
    );
}


function StepOrderDetails() {
    const { control } = useFormContext();
    const whoPaysToll = useWatch({ control, name: "orderDetails.whoPaysToll" });
    const needsTracker = useWatch({ control, name: "orderDetails.needsTracker" });
    const driverNeedsToHelp = useWatch({ control, name: "orderDetails.driverNeedsToHelp" });
    const needsHelper = useWatch({ control, name: "orderDetails.needsHelper" });

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-semibold">3. Informações do Pedido</h2>
                <p className="text-muted-foreground">Detalhes sobre a carga, operação e requisitos.</p>
            </div>
            <Separator />

            <FormField
                control={control}
                name="orderDetails.whatWillBeLoaded"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>O que será carregado?</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Descreva a carga. Ex: Soja, peças automotivas, produtos de limpeza..." {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <div className="space-y-4">
                 <FormField
                    control={control}
                    name="orderDetails.whoPaysToll"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Quem paga o pedágio?</FormLabel>
                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione uma opção" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="empresa">Empresa</SelectItem>
                                    <SelectItem value="motorista">Motorista</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {whoPaysToll && (
                     <FormField
                        control={control}
                        name="orderDetails.tollTripScope"
                        render={({ field }) => (
                            <FormItem className="pl-4 border-l-2 ml-2">
                                <FormLabel>O pedágio cobre qual trecho?</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        className="flex flex-col gap-2 pt-2"
                                    >
                                        <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="apenas_ida" /></FormControl><FormLabel className="font-normal">Apenas Ida</FormLabel></FormItem>
                                        <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="apenas_volta" /></FormControl><FormLabel className="font-normal">Apenas Volta</FormLabel></FormItem>
                                        <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="ida_e_volta" /></FormControl><FormLabel className="font-normal">Ida e Volta</FormLabel></FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
            </div>
            
            <div className="space-y-4">
                <FormField
                    control={control}
                    name="orderDetails.needsTracker"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel>Precisa de Rastreador?</FormLabel>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )}
                />
                 {needsTracker && (
                     <FormField
                        control={control}
                        name="orderDetails.trackerType"
                        render={({ field }) => (
                            <FormItem className="pl-4 border-l-2 ml-2">
                                <FormLabel>Qual?</FormLabel>
                                <FormControl><Input placeholder="Ex: Sascar, Omnilink" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                 )}
            </div>

             <FormField
                control={control}
                name="orderDetails.cargoType"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Tipo de Carga</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo de carga" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="paletizado">Paletizado</SelectItem>
                                <SelectItem value="granel">A Granel</SelectItem>
                                <SelectItem value="caixas">Em Caixas</SelectItem>
                                <SelectItem value="sacos">Sacos</SelectItem>
                                <SelectItem value="outros">Outros</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={control}
                name="orderDetails.isDangerousCargo"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <FormLabel>Carga Perigosa?</FormLabel>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                )}
            />

            <div className="space-y-4">
                <FormField
                    control={control}
                    name="orderDetails.driverNeedsToHelp"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel>Precisa de ajuda do motorista?</FormLabel>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )}
                />
                 {driverNeedsToHelp && (
                     <FormField
                        control={control}
                        name="orderDetails.driverHelpScope"
                        render={({ field }) => (
                            <FormItem className="pl-4 border-l-2 ml-2">
                                <FormLabel>Onde o motorista precisa ajudar?</FormLabel>
                                 <FormControl>
                                    <RadioGroup
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        className="flex flex-col gap-2 pt-2"
                                    >
                                        <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="apenas_carregamento" /></FormControl><FormLabel className="font-normal">Apenas no Carregamento</FormLabel></FormItem>
                                        <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="apenas_descarregamento" /></FormControl><FormLabel className="font-normal">Apenas no Descarregamento</FormLabel></FormItem>
                                        <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="carga_e_descarga" /></FormControl><FormLabel className="font-normal">Carga e Descarga</FormLabel></FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                 )}
            </div>

             <div className="space-y-4">
                <FormField
                    control={control}
                    name="orderDetails.needsHelper"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel>Precisa de Ajudante?</FormLabel>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )}
                />
                 {needsHelper && (
                     <FormField
                        control={control}
                        name="orderDetails.whoPaysHelper"
                        render={({ field }) => (
                            <FormItem className="pl-4 border-l-2 ml-2">
                                <FormLabel>Quem paga o ajudante?</FormLabel>
                                 <FormControl>
                                    <RadioGroup
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        className="flex flex-col gap-2 pt-2"
                                    >
                                        <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="empresa" /></FormControl><FormLabel className="font-normal">Empresa</FormLabel></FormItem>
                                        <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="motorista" /></FormControl><FormLabel className="font-normal">Motorista</FormLabel></FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                 )}
            </div>

            <FormField
                control={control}
                name="orderDetails.hasInvoice"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <FormLabel>Mercadoria possui Nota Fiscal?</FormLabel>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                )}
            />

             <FormField
                control={control}
                name="orderDetails.driverNeedsToIssueInvoice"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <FormLabel>Motorista precisa emitir Nota Fiscal?</FormLabel>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                )}
            />

            <FormField
                control={control}
                name="orderDetails.driverNeedsANTT"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <FormLabel>Motorista precisa ter ANTT?</FormLabel>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                )}
            />

            <div className="space-y-2">
                <FormField
                    control={control}
                    name="orderDetails.needsSpecificCourses"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel>Motorista precisa ter algum curso específico?</FormLabel>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )}
                />
                 <ConditionalListInput
                    controlName="orderDetails.specificCourses"
                    switchName="orderDetails.needsSpecificCourses"
                    label="Quais cursos?"
                    placeholder="Ex: MOPP, Carga Indivisível"
                />
            </div>

            <FormField
                control={control}
                name="orderDetails.minimumVehicleAge"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Idade mínima do veículo para agregar (Opcional)</FormLabel>
                        <FormControl><Input placeholder="Ex: 2015" {...field} type="number" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            
            <div className="space-y-2">
                <ConditionalListInput
                    controlName="orderDetails.benefits"
                    label="Benefícios (Opcional)"
                    placeholder="Ex: Vale Combustível"
                />
            </div>
            
            <FormField
                control={control}
                name="orderDetails.paymentMethods"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Formas de Pagamento (Opcional)</FormLabel>
                        <FormControl><Input placeholder="Ex: Depósito, PIX" {...field} /></FormControl>
                         <FormDescription>Descreva como o motorista será pago.</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    );
}

// =================================================================
// Componente Principal
// =================================================================

export default function AgregamentoClient({ companyId }: { companyId: string }) {
  const [currentStep, setCurrentStep] = useState(0);
  
  const methods = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      responsibleCollaborators: [],
      origin: { state: '', city: '' },
      destinations: [{ state: '', city: '' }],
      orderDetails: {
        whatWillBeLoaded: '',
        needsTracker: false,
        isDangerousCargo: false,
        driverNeedsToHelp: false,
        needsHelper: false,
        hasInvoice: false,
        driverNeedsToIssueInvoice: false,
        driverNeedsANTT: false,
        needsSpecificCourses: false,
        specificCourses: [],
        benefits: [],
      }
    }
  });

  const { handleSubmit, trigger, formState: { isSubmitting } } = methods;

  async function processForm(data: FormData) {
    console.log("Form data:", data);
    // Lógica para enviar o formulário virá aqui
  }

  type FieldName = keyof FormData;

  const nextStep = async () => {
    const fields = steps[currentStep].fields as FieldName[];
    const output = await trigger(fields, { shouldFocus: true });

    if (!output) return;

    if (currentStep < steps.length - 1) {
      setCurrentStep(step => step + 1);
      window.scrollTo(0, 0);
    } else {
      await handleSubmit(processForm)();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(step => step - 1);
       window.scrollTo(0, 0);
    }
  };
  
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <Card className="shadow-lg">
      <CardHeader>
         <div className="mb-4">
            <p className="text-sm text-muted-foreground">Etapa {currentStep + 1} de {steps.length}: {steps[currentStep].name}</p>
            <Progress value={progress} className="mt-2" />
        </div>
      </CardHeader>
      <CardContent>
          <FormProvider {...methods}>
              <form onSubmit={handleSubmit(processForm)}>
                  {currentStep === 0 && <StepCollaborators companyId={companyId} />}
                  {currentStep === 1 && <StepRoute />}
                  {currentStep === 2 && <StepOrderDetails />}
                  {/* Outras etapas virão aqui */}
              </form>
          </FormProvider>

          <div className="mt-8 flex justify-between">
              <Button onClick={prevStep} variant="outline" disabled={currentStep === 0 || isSubmitting}>
                  Voltar
              </Button>
              <Button onClick={nextStep} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {currentStep < steps.length - 1 ? 'Próximo' : 'Enviar Solicitação'}
              </Button>
          </div>
      </CardContent>
    </Card>
  );
}
