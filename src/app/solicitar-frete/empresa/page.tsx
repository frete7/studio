
'use client';

import { useState, useEffect } from 'react';
import { useForm, FormProvider, useFormContext, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { onSnapshot, collection, query, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { groupBy } from 'lodash';


import { type Collaborator, type BodyType, type VehicleType, type VehicleCategory, addCompleteFreight } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Loader2, User, Search, PlusCircle, Trash2, ArrowLeft, Copy, Calendar as CalendarIcon, Truck, Box, Edit, CheckCircle, Info } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, formatISO } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


// =================================================================
// Schemas e Tipos
// =================================================================

const locationSchema = z.object({
  state: z.string().min(1, "O estado é obrigatório."),
  city: z.string().min(1, "A cidade é obrigatória."),
});

const destinationSchema = locationSchema.extend({
    stops: z.coerce.number().int().min(1, "Deve haver pelo menos 1 parada.")
});

const collaboratorSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
});

const orderDetailsSchema = z.object({
    whatWillBeLoaded: z.string().min(3, "Este campo é obrigatório."),
    weight: z.string().min(1, "O peso é obrigatório.").refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: "O peso não pode ser negativo." }),
    dimensions: z.object({
        height: z.string().optional().refine(val => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), { message: "Altura não pode ser negativa." }),
        width: z.string().optional().refine(val => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), { message: "Largura não pode ser negativa." }),
        length: z.string().optional().refine(val => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), { message: "Comprimento não pode ser negativo." }),
    }).optional(),
    cubicMeters: z.string().optional().refine(val => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), { message: "M³ não pode ser negativo." }),
    whoPaysToll: z.enum(['empresa', 'motorista'], { required_error: "Selecione quem paga o pedágio." }),
    tollTripScope: z.string().optional(),
    needsTracker: z.boolean().default(false),
    trackerType: z.string().optional(),
    cargoType: z.enum(['paletizado', 'granel', 'caixas', 'sacos', 'outros']),
    isDangerousCargo: z.boolean().default(false),
    hasInvoice: z.boolean().default(false),
    driverNeedsToIssueInvoice: z.boolean().default(false),
    driverNeedsToHelp: z.enum(['nao', 'carregamento', 'descarregamento', 'ambos']),
    needsHelper: z.boolean().default(false),
    whoPaysHelper: z.enum(['empresa', 'motorista']).optional(),
    driverNeedsANTT: z.boolean().default(false),
    needsSpecificCourses: z.boolean().default(false),
    specificCourses: z.array(z.object({ value: z.string().min(1, "O nome do curso não pode ser vazio.") })).optional(),
    minimumVehicleAge: z.string().optional(),
    loadingDate: z.date().optional(),
    loadingTime: z.string().optional(),
    paymentType: z.enum(['coleta', 'entrega', '50-50', 'customizado']),
    customPayment: z.object({
        type: z.enum(['faturado', 'parcelado', 'coleta-entrega']).optional(),
        faturadoDays: z.coerce.number().optional(),
        parceladoCount: z.coerce.number().optional(),
        coletaPercentage: z.coerce.number().optional(),
        entregaPercentage: z.coerce.number().optional(),
    }).optional(),
}).refine(data => data.whoPaysToll === undefined || data.tollTripScope !== undefined, {
    message: "Selecione o trecho do pedágio.",
    path: ['tollTripScope'],
}).refine(data => !data.needsTracker || (data.trackerType && data.trackerType.length > 0), {
    message: "Especifique o tipo de rastreador.",
    path: ['trackerType'],
}).refine(data => !data.needsHelper || !!data.whoPaysHelper, {
    message: "Selecione quem paga pelo ajudante.",
    path: ['whoPaysHelper'],
}).refine(data => !data.needsSpecificCourses || (data.specificCourses !== undefined && data.specificCourses.length > 0), {
    message: "Adicione pelo menos um curso.",
    path: ['specificCourses'],
}).refine(data => {
    if (data.paymentType !== 'customizado') return true;
    if (!data.customPayment?.type) return false;
    if (data.customPayment.type === 'faturado' && !data.customPayment.faturadoDays) return false;
    if (data.customPayment.type === 'parcelado' && !data.customPayment.parceladoCount) return false;
    if (data.customPayment.type === 'coleta-entrega' && (!data.customPayment.coletaPercentage || !data.customPayment.entregaPercentage)) return false;
    if (data.customPayment.type === 'coleta-entrega' && (data.customPayment.coletaPercentage ?? 0) + (data.customPayment.entregaPercentage ?? 0) !== 100) return false;
    return true;
}, { 
    message: "Preencha os detalhes do pagamento customizado.", 
    path: ['customPayment'] 
});


const formSchema = z.object({
  responsibleCollaborators: z.array(collaboratorSchema).refine(value => value.length > 0, {
    message: "Você deve selecionar pelo menos um colaborador.",
  }),
  origin: locationSchema,
  destinations: z.array(destinationSchema).min(1, "Adicione pelo menos um destino."),
  orderDetails: orderDetailsSchema,
  requiredBodyworks: z.array(z.string()).refine(value => value.length > 0, {
    message: "Você deve selecionar pelo menos um tipo de carroceria.",
  }),
  requiredVehicles: z.array(z.string()).refine(value => value.length > 0, {
    message: "Você deve selecionar pelo menos um tipo de veículo.",
  }),
  isPriceToCombine: z.boolean().default(false),
  price: z.string().optional(),
}).refine(data => {
    if(data.isPriceToCombine) return true;
    return data.price !== undefined && data.price !== '' && !isNaN(parseFloat(data.price)) && parseFloat(data.price) > 0;
}, {
    message: 'O valor do frete é obrigatório e deve ser maior que zero, se não for a combinar.',
    path: ['price'],
});

type FormData = z.infer<typeof formSchema>;
type IBGEState = { id: number; sigla: string; nome: string; };
type IBGECity = { id: number; nome: string; };

const steps = [
  { id: 1, name: 'Responsáveis', fields: ['responsibleCollaborators'] },
  { id: 2, name: 'Rota', fields: ['origin', 'destinations'] },
  { id: 3, name: 'Informações do Pedido', fields: ['orderDetails'] },
  { id: 4, name: 'Veículo e Valor', fields: ['requiredBodyworks', 'requiredVehicles', 'price', 'isPriceToCombine'] },
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
  
  if (isLoading) {
      return (
        <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary"/>
        </div>
      );
  }

  if (collaborators.length === 0) {
      return (
        <div className="text-center py-10 space-y-4">
            <h3 className="text-xl font-semibold">Nenhum Colaborador Encontrado</h3>
            <p className="text-muted-foreground">Você precisa cadastrar pelo menos um colaborador para poder criar uma solicitação.</p>
            <Button asChild>
                <Link href="/profile/collaborators">
                    <PlusCircle className="mr-2 h-4 w-4"/>
                    Cadastrar Colaborador
                </Link>
            </Button>
        </div>
      )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">1. Colaboradores Responsáveis</h2>
      <p className="text-muted-foreground">Selecione quem serão os contatos principais para este frete.</p>
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
                {filteredCollaborators.length > 0 ? (
                    filteredCollaborators.map((item) => (
                        <FormField
                            key={item.id}
                            control={control}
                            name="responsibleCollaborators"
                            render={({ field }) => {
                                const selectedCollaborator = { id: item.id, name: item.name, phone: item.phone };
                                const isChecked = field.value?.some((c: any) => c.id === item.id);
                                return (
                                <FormItem
                                    key={item.id}
                                    className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"
                                >
                                    <FormControl>
                                    <Checkbox
                                        checked={isChecked}
                                        onCheckedChange={(checked) => {
                                        return checked
                                            ? field.onChange([...(field.value || []), selectedCollaborator])
                                            : field.onChange(
                                                field.value?.filter(
                                                (c: any) => c.id !== item.id
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
                    <p className="text-center text-muted-foreground py-10">Nenhum colaborador encontrado com o termo "{searchTerm}".</p>
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
    const { control } = useFormContext();
    const { fields, append, remove } = useFieldArray({
        control,
        name: "destinations",
    });

    const allDestinations = useWatch({ control, name: "destinations" });
    const lastDestination = allDestinations[allDestinations.length - 1];
    const isAddDisabled = !lastDestination || !lastDestination.state || !lastDestination.city;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-semibold">2. Rota do Frete</h2>
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
                            <FormField
                                control={control}
                                name={`destinations.${index}.stops`}
                                render={({ field: stopsField }) => (
                                    <FormItem className="mt-4">
                                        <FormLabel>Número de Paradas no Destino</FormLabel>
                                        <FormControl>
                                            <Input type="number" min="1" {...stopsField} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </Card>
                    ))}
                 </div>
                 <Button
                    type="button"
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => append({ state: '', city: '', stops: 1 })}
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

function ConditionalListInput({ controlName, switchName, label, placeholder, inputType = 'text' }: { controlName: string, switchName?: string, label: string, placeholder: string, inputType?: string }) {
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
                                    <Input type={inputType} placeholder={`${placeholder} #${index + 1}`} {...itemField} />
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
    const { control, watch } = useFormContext();
    const whoPaysToll = watch("orderDetails.whoPaysToll");
    const needsTracker = watch("orderDetails.needsTracker");
    const needsHelper = watch("orderDetails.needsHelper");
    const paymentType = watch("orderDetails.paymentType");
    const customPaymentType = watch("orderDetails.customPayment.type");
    const vehicleAgeYears = Array.from({ length: new Date().getFullYear() - 1969 }, (_, i) => (new Date().getFullYear() - i).toString());

    return (
         <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-semibold">3. Informações do Pedido</h2>
                <p className="text-muted-foreground">Detalhes sobre a carga, operação e requisitos.</p>
            </div>
            <Separator />

            <FormField control={control} name="orderDetails.whatWillBeLoaded" render={({ field }) => (
                <FormItem>
                    <FormLabel>O que será carregado?</FormLabel>
                    <FormControl><Textarea placeholder="Ex: Soja, autopeças, etc." {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />

             <div className="grid md:grid-cols-2 gap-4">
                 <FormField control={control} name="orderDetails.weight" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Qual o peso?</FormLabel>
                        <FormControl><Input type="number" placeholder="Ex: 1500 (em kg)" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                 <FormField control={control} name="orderDetails.cubicMeters" render={({ field }) => (
                    <FormItem>
                        <FormLabel>M³ (opcional)</FormLabel>
                        <FormControl><Input type="number" placeholder="Metros cúbicos" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
            </div>

            <div>
                <FormLabel>Dimensões (opcional)</FormLabel>
                <div className="grid md:grid-cols-3 gap-4 mt-2">
                     <FormField control={control} name="orderDetails.dimensions.height" render={({ field }) => (<FormItem><FormLabel className="text-xs">Altura (m)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                     <FormField control={control} name="orderDetails.dimensions.width" render={({ field }) => (<FormItem><FormLabel className="text-xs">Largura (m)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                     <FormField control={control} name="orderDetails.dimensions.length" render={({ field }) => (<FormItem><FormLabel className="text-xs">Comprimento (m)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
            </div>
            
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

            <div className="space-y-2">
                 <FormField control={control} name="orderDetails.needsTracker" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel>Precisa de Rastreador?</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                {needsTracker && (
                    <FormField control={control} name="orderDetails.trackerType" render={({ field }) => (<FormItem className="pl-4 border-l-2 ml-2"><FormLabel>Qual?</FormLabel><FormControl><Input placeholder="Ex: Sascar, Omnilink" {...field} /></FormControl><FormMessage /></FormItem>)} />
                )}
            </div>

            <FormField control={control} name="orderDetails.cargoType" render={({ field }) => (<FormItem><FormLabel>Tipo de Carga</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="paletizado">Paletizado</SelectItem><SelectItem value="granel">A Granel</SelectItem><SelectItem value="caixas">Em Caixas</SelectItem><SelectItem value="sacos">Sacos</SelectItem><SelectItem value="outros">Outros</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
            <FormField control={control} name="orderDetails.isDangerousCargo" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel>Carga Perigosa?</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
            <FormField control={control} name="orderDetails.hasInvoice" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel>Mercadoria possui Nota Fiscal?</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
            <FormField control={control} name="orderDetails.driverNeedsToIssueInvoice" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel>Motorista precisa emitir Nota Fiscal?</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
           
            <FormField control={control} name="orderDetails.driverNeedsToHelp" render={({ field }) => (<FormItem><FormLabel>Ajuda do motorista?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col gap-2 pt-2"><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="nao" /></FormControl><FormLabel className="font-normal">Não preciso de ajuda</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="carregamento" /></FormControl><FormLabel className="font-normal">Apenas no Carregamento</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="descarregamento" /></FormControl><FormLabel className="font-normal">Apenas no Descarregamento</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="ambos" /></FormControl><FormLabel className="font-normal">Carga e Descarga</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)} />
            
            <div className="space-y-2">
                 <FormField control={control} name="orderDetails.needsHelper" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel>Precisa de Ajudante?</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
                 {needsHelper && (
                     <FormField control={control} name="orderDetails.whoPaysHelper" render={({ field }) => (<FormItem className="pl-4 border-l-2 ml-2"><FormLabel>Quem paga o ajudante?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center gap-4 pt-2"><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="empresa" /></FormControl><FormLabel className="font-normal">Empresa</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="motorista" /></FormControl><FormLabel className="font-normal">Motorista</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>)} />
                 )}
            </div>

            <FormField control={control} name="orderDetails.driverNeedsANTT" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel>Motorista precisa ter ANTT?</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
            
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

            <FormField control={control} name="orderDetails.minimumVehicleAge" render={({ field }) => (<FormItem><FormLabel>Idade mínima do veículo (opcional)</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione o ano" /></SelectTrigger></FormControl><SelectContent><SelectItem value="none">Nenhuma</SelectItem>{vehicleAgeYears.map(year => (<SelectItem key={year} value={year}>{year}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
        
            <div className="grid md:grid-cols-2 gap-4">
                 <FormField control={control} name="orderDetails.loadingDate" render={({ field }) => (
                     <FormItem className="flex flex-col"><FormLabel>Data de Carregamento</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}><>{field.value ? (format(field.value, "PPP")) : (<span>Escolha uma data</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date() || date < new Date("1900-01-01")} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                 )} />
                 <FormField control={control} name="orderDetails.loadingTime" render={({ field }) => (
                     <FormItem><FormLabel>Hora de Carregamento</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                 )} />
            </div>

            <FormField control={control} name="orderDetails.paymentType" render={({ field }) => (
                <FormItem>
                    <FormLabel>Tipo de Pagamento</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="coleta">Na Coleta</SelectItem>
                            <SelectItem value="entrega">Na Entrega</SelectItem>
                            <SelectItem value="50-50">50% na Coleta, 50% na Entrega</SelectItem>
                            <SelectItem value="customizado">Customizado</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )} />
            
            {paymentType === 'customizado' && (
                <div className="p-4 border rounded-md space-y-4">
                     <FormField control={control} name="orderDetails.customPayment.type" render={({ field }) => (
                         <FormItem><FormLabel>Opção de Pagamento Customizado</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col gap-2 pt-2"><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="faturado" /></FormControl><FormLabel className="font-normal">Faturado</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="parcelado" /></FormControl><FormLabel className="font-normal">Parcelado</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="coleta-entrega" /></FormControl><FormLabel className="font-normal">Coleta/Entrega %</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>
                     )} />

                     {customPaymentType === 'faturado' && (
                         <FormField control={control} name="orderDetails.customPayment.faturadoDays" render={({ field }) => (<FormItem><FormLabel>Dias para faturar</FormLabel><FormControl><Input type="number" placeholder="Ex: 30" {...field} /></FormControl><FormMessage /></FormItem>)} />
                     )}
                      {customPaymentType === 'parcelado' && (
                         <FormField control={control} name="orderDetails.customPayment.parceladoCount" render={({ field }) => (<FormItem><FormLabel>Quantidade de parcelas</FormLabel><FormControl><Input type="number" placeholder="Ex: 3" {...field} /></FormControl><FormMessage /></FormItem>)} />
                     )}
                     {customPaymentType === 'coleta-entrega' && (
                         <div className="grid grid-cols-2 gap-4">
                            <FormField control={control} name="orderDetails.customPayment.coletaPercentage" render={({ field }) => (<FormItem><FormLabel>% na Coleta</FormLabel><FormControl><Input type="number" placeholder="Ex: 30" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={control} name="orderDetails.customPayment.entregaPercentage" render={({ field }) => (<FormItem><FormLabel>% na Entrega</FormLabel><FormControl><Input type="number" placeholder="Ex: 70" {...field} /></FormControl><FormMessage /></FormItem>)} />
                         </div>
                     )}
                     <FormField control={control} name="orderDetails.customPayment" render={({fieldState}) => <FormMessage>{fieldState.error?.message}</FormMessage>} />
                </div>
            )}
        </div>
    )
}

function StepVehicleAndBodywork({ allData }: { allData: any }) {
    const { control, watch } = useFormContext();
    
    const { groupedBodyworks, groupedVehicleTypes } = allData;
    const isPriceToCombine = watch('isPriceToCombine');

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-semibold">4. Veículo e Valor</h2>
                <p className="text-muted-foreground">Especifique os veículos necessários e o valor do frete.</p>
            </div>
            <Separator />
            
             <FormField control={control} name="orderDetails.weight" render={({ field }) => (
                <FormItem>
                    <FormLabel>Peso da Carga (kg)</FormLabel>
                    <FormControl><Input type="number" placeholder="Ex: 1500" {...field} /></FormControl>
                    <FormDescription>Confirme ou edite o peso total da carga.</FormDescription>
                    <FormMessage />
                </FormItem>
            )} />

            <Separator />

            {/* Seleção de Carroceria */}
            <FormField
                control={control}
                name="requiredBodyworks"
                render={() => (
                    <FormItem>
                         <div className="mb-4">
                            <FormLabel className="text-base font-semibold">Tipos de Carroceria</FormLabel>
                            <FormDescription>Selecione um ou mais tipos de carroceria que o veículo deve ter.</FormDescription>
                        </div>
                        <Accordion type="multiple" className="w-full" defaultValue={Object.keys(groupedBodyworks)}>
                            {Object.entries(groupedBodyworks).map(([group, types]: [string, any]) => (
                                <AccordionItem key={group} value={group}>
                                    <AccordionTrigger>{group}</AccordionTrigger>
                                    <AccordionContent>
                                         <div className="grid grid-cols-2 gap-4 p-2">
                                            {types.map((item: any) => (
                                                <FormField
                                                    key={item.id}
                                                    control={control}
                                                    name="requiredBodyworks"
                                                    render={({ field }) => (
                                                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                                            <FormControl>
                                                                <Checkbox
                                                                    checked={field.value?.includes(item.id)}
                                                                    onCheckedChange={(checked) => {
                                                                        return checked
                                                                            ? field.onChange([...(field.value || []), item.id])
                                                                            : field.onChange(field.value?.filter((value) => value !== item.id))
                                                                    }}
                                                                />
                                                            </FormControl>
                                                            <FormLabel className="font-normal">{item.name}</FormLabel>
                                                        </FormItem>
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <Separator />
            
            {/* Seleção de Veículos */}
             <FormField
                control={control}
                name="requiredVehicles"
                render={() => (
                    <FormItem>
                         <div className="mb-4">
                            <FormLabel className="text-base font-semibold">Tipos de Veículo</FormLabel>
                            <FormDescription>Selecione os veículos que podem realizar o serviço.</FormDescription>
                        </div>

                        <Accordion type="multiple" className="w-full" defaultValue={Object.keys(groupedVehicleTypes)}>
                            {Object.entries(groupedVehicleTypes).map(([category, types]: [string, any]) => (
                                <AccordionItem key={category} value={category}>
                                     <AccordionTrigger>{category}</AccordionTrigger>
                                     <AccordionContent>
                                        <div className="grid grid-cols-2 gap-4 p-2">
                                             {types.map((item: any) => (
                                                <FormField
                                                    key={item.id}
                                                    control={control}
                                                    name="requiredVehicles"
                                                    render={({ field }) => (
                                                         <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                                            <FormControl>
                                                                <Checkbox
                                                                    checked={field.value?.includes(item.id)}
                                                                    onCheckedChange={(checked) => {
                                                                        return checked
                                                                            ? field.onChange([...(field.value || []), item.id])
                                                                            : field.onChange(field.value?.filter((value) => value !== item.id))
                                                                    }}
                                                                />
                                                            </FormControl>
                                                            <FormLabel className="font-normal">{item.name}</FormLabel>
                                                        </FormItem>
                                                    )}
                                                />
                                             ))}
                                        </div>
                                     </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                        <FormMessage />
                    </FormItem>
                )}
            />

             <Separator />

            <div className="space-y-4">
                <FormField
                    control={control}
                    name="isPriceToCombine"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">Valor a Combinar</FormLabel>
                                <FormDescription>Marque esta opção se o valor for negociado diretamente com o motorista.</FormDescription>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )}
                />

                {!isPriceToCombine && (
                    <FormField
                        control={control}
                        name="price"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Valor do Frete (R$)</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="Ex: 2500.00" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
            </div>
        </div>
    );
}

function SummaryView({ data, onEdit, allData, companyId, freightType }: { data: FormData; onEdit: (step: number) => void; allData: any, companyId: string, freightType: string }) {
    const { origin, destinations, orderDetails, requiredVehicles, requiredBodyworks, responsibleCollaborators, isPriceToCombine, price } = data;
    const [collaboratorNames, setCollaboratorNames] = useState<string[]>([]);
    
    useEffect(() => {
        const fetchNames = async () => {
            if(responsibleCollaborators.length > 0){
                 const selectedCollaborators = allData.collaborators.filter((c: Collaborator) => responsibleCollaborators.includes(c.id));
                 setCollaboratorNames(selectedCollaborators.map((c: Collaborator) => c.name));
            }
        };
        fetchNames();
    }, [responsibleCollaborators, allData.collaborators]);
    
    const getBodyworkNames = () => {
        if (!requiredBodyworks || !allData.groupedBodyworks) return [];
        const allTypes: BodyType[] = Object.values(allData.groupedBodyworks).flat();
        return requiredBodyworks.map(id => allTypes.find(bw => bw.id === id)?.name || id);
    }
    
    const getVehicleNames = () => {
        if (!requiredVehicles || !allData.vehicleTypes) return [];
        return requiredVehicles.map(id => allData.vehicleTypes.find((v: VehicleType) => v.id === id)?.name || id);
    }

    const bodyworkNames = getBodyworkNames();
    const vehicleNames = getVehicleNames();


    const SummarySection = ({ title, stepIndex, children }: { title: string, stepIndex: number, children: React.ReactNode }) => (
        <div className="space-y-3">
            <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg">{title}</h3>
                <Button variant="link" size="sm" onClick={() => onEdit(stepIndex)} className="h-auto p-0">
                    <Edit className="mr-1 h-3 w-3" />
                    Editar
                </Button>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground p-3 border rounded-md bg-muted/30">{children}</div>
        </div>
    )

    const DetailItem = ({ label, value, isBool = false }: { label: string, value?: React.ReactNode, isBool?: boolean }) => {
        if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) return null;
        let displayValue = value;
        if(isBool) displayValue = value ? "Sim" : "Não";

        return (
            <div className="flex justify-between">
                <p className="font-medium text-foreground/80">{label}:</p>
                <p className="text-right">{displayValue as React.ReactNode}</p>
            </div>
        )
    };
    
    const DetailList = ({ label, list }: { label: string, list?: {value: string}[] }) => {
        if (!list || list.length === 0) return null;
        return (
            <div>
                <p className="font-medium text-foreground/80">{label}:</p>
                <ul className="list-disc list-inside pl-4">
                    {list.map((item, index) => <li key={index}>{item.value}</li>)}
                </ul>
            </div>
        )
    }

    return (
        <div className="space-y-6 text-sm max-h-[70vh] overflow-y-auto pr-4">
             <div className="text-center p-2 bg-primary/10 rounded-md">
                <p className="font-semibold">Tipo de Frete: <span className="text-primary capitalize">{freightType === 'completo' ? 'Completo' : 'Retorno'}</span></p>
             </div>

            <SummarySection title="Responsáveis" stepIndex={0}>
                <DetailItem label="Colaboradores" value={collaboratorNames.join(', ')} />
            </SummarySection>

            <SummarySection title="Rota" stepIndex={1}>
                <p className="font-medium text-foreground/80">Origem:</p>
                <p className="pl-2">{origin.city}, {origin.state}</p>
                <Separator className="my-2"/>
                 <p className="font-medium text-foreground/80">Destinos:</p>
                <ul className="list-decimal list-inside pl-2">
                    {destinations.map((d, i) => <li key={i}>{d.city}, {d.state} ({d.stops} parada(s))</li>)}
                </ul>
            </SummarySection>
            
            <SummarySection title="Informações do Pedido" stepIndex={2}>
                 <DetailItem label="Carga" value={orderDetails.whatWillBeLoaded} />
                 <DetailItem label="Peso" value={`${orderDetails.weight} kg`} />
                 <DetailItem label="Cubagem" value={orderDetails.cubicMeters ? `${orderDetails.cubicMeters} m³` : 'Não informado'} />
                 <DetailItem label="Tipo de Carga" value={orderDetails.cargoType} />
                 <DetailItem label="Data Carregamento" value={orderDetails.loadingDate ? format(orderDetails.loadingDate, 'dd/MM/yyyy') : 'Não informada'} />
                 <DetailItem label="Hora Carregamento" value={orderDetails.loadingTime || 'Não informada'} />
                 <Separator className="my-2" />
                 <DetailItem label="Pedágio pago por" value={orderDetails.whoPaysToll} />
                 <DetailItem label="Trecho do Pedágio" value={orderDetails.tollTripScope} />
                 <Separator className="my-2" />
                 <DetailItem label="Precisa de Rastreador" value={orderDetails.needsTracker} isBool />
                 <DetailItem label="Tipo de Rastreador" value={orderDetails.trackerType} />
                 <Separator className="my-2" />
                 <DetailItem label="Carga Perigosa" value={orderDetails.isDangerousCargo} isBool />
                 <DetailItem label="Ajuda do motorista" value={orderDetails.driverNeedsToHelp} />
                 <DetailItem label="Precisa de Ajudante" value={orderDetails.needsHelper} isBool />
                 <DetailItem label="Ajudante pago por" value={orderDetails.whoPaysHelper} />
                 <Separator className="my-2" />
                 <DetailItem label="Possui Nota Fiscal" value={orderDetails.hasInvoice} isBool />
                 <DetailItem label="Motorista emite NF" value={orderDetails.driverNeedsToIssueInvoice} isBool />
                 <DetailItem label="Precisa de ANTT" value={orderDetails.driverNeedsANTT} isBool />
                 <Separator className="my-2" />
                 <DetailItem label="Precisa de Cursos Específicos" value={orderDetails.needsSpecificCourses} isBool />
                 <DetailList label="Cursos" list={orderDetails.specificCourses} />
                 <DetailItem label="Idade Mínima do Veículo" value={orderDetails.minimumVehicleAge === 'none' ? 'Nenhuma' : orderDetails.minimumVehicleAge} />
                 <Separator className="my-2" />
                 <DetailItem label="Tipo de Pagamento" value={orderDetails.paymentType} />
                 {/* TODO: Add custom payment details */}
            </SummarySection>

            <SummarySection title="Veículo e Valor" stepIndex={3}>
                <DetailItem label="Carrocerias" value={bodyworkNames.join(', ')} />
                <DetailItem label="Veículos" value={vehicleNames.join(', ')} />
                <Separator className="my-2"/>
                {isPriceToCombine ? (
                     <DetailItem label="Valor" value="A Combinar" />
                ) : (
                     <DetailItem label="Valor do Frete" value={Number(price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                )}
            </SummarySection>
        </div>
    );
}

// =================================================================
// Componente Principal
// =================================================================

export default function RequestCompanyFreightPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [generatedId, setGeneratedId] = useState<string>('');
  const [countdown, setCountdown] = useState(10);
  const searchParams = useSearchParams();
  const router = useRouter();

  const [allData, setAllData] = useState({
      groupedBodyworks: {},
      groupedVehicleTypes: {},
      vehicleTypes: [],
      vehicleCategories: [],
      collaborators: [],
  });

  const freightType = (searchParams.get('type') || 'completo') as 'completo' | 'retorno';

  const initialValues = {
      responsibleCollaborators: [],
      origin: { state: '', city: '' },
      destinations: [{ state: '', city: '', stops: 1 }],
      orderDetails: {
          whatWillBeLoaded: '',
          weight: '',
          dimensions: { height: '', width: '', length: '' },
          cubicMeters: '',
          needsTracker: false,
          trackerType: '',
          cargoType: 'caixas' as 'paletizado' | 'granel' | 'caixas' | 'sacos' | 'outros',
          isDangerousCargo: false,
          hasInvoice: false,
          driverNeedsToIssueInvoice: false,
          driverNeedsToHelp: 'nao' as 'nao' | 'carregamento' | 'descarregamento' | 'ambos',
          needsHelper: false,
          whoPaysHelper: undefined,
          driverNeedsANTT: false,
          needsSpecificCourses: false,
          specificCourses: [],
          minimumVehicleAge: 'none',
          loadingDate: undefined,
          loadingTime: '',
          paymentType: 'entrega' as 'coleta' | 'entrega' | '50-50' | 'customizado',
          whoPaysToll: '',
          tollTripScope: '',
          customPayment: {
              type: undefined,
              faturadoDays: undefined,
              parceladoCount: undefined,
              coletaPercentage: undefined,
              entregaPercentage: undefined,
          }
      },
      requiredBodyworks: [],
      requiredVehicles: [],
      isPriceToCombine: false,
      price: ''
  }

  const methods = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: 'onBlur',
    defaultValues: initialValues
  });

  const { handleSubmit, trigger, formState: { isSubmitting }, getValues, reset } = methods;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
            setUser(currentUser);
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            if(userDoc.exists()) {
                setProfile(userDoc.data());
            }
        } else {
            router.push('/login');
        }
        setIsLoading(false);
    });
    
     const fetchData = async (uid: string) => {
          setIsDataLoading(true);
          try {
              const [bodyTypesSnap, vehicleTypesSnap, vehicleCategoriesSnap, collaboratorsSnap] = await Promise.all([
                  getDocs(query(collection(db, 'body_types'))),
                  getDocs(query(collection(db, 'vehicle_types'))),
                  getDocs(query(collection(db, 'vehicle_categories'))),
                  getDocs(query(collection(db, `users/${uid}/collaborators`)))
              ]);

              const bodyTypes: BodyType[] = bodyTypesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as BodyType));
              const vehicleTypes: VehicleType[] = vehicleTypesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as VehicleType));
              const vehicleCategories: VehicleCategory[] = vehicleCategoriesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as VehicleCategory));
              const collaborators: Collaborator[] = collaboratorsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Collaborator));

              const groupedBodyworks = groupBy(bodyTypes, 'group');
              const categoryMap = new Map(vehicleCategories.map(c => [c.id, c.name]));
              const typesWithCatName = vehicleTypes.map(vt => ({ ...vt, categoryName: categoryMap.get(vt.categoryId) || 'Outros' }));
              const groupedVehicleTypes = groupBy(typesWithCatName, 'categoryName');

              setAllData({
                  groupedBodyworks,
                  groupedVehicleTypes,
                  vehicleTypes,
                  vehicleCategories,
                  collaborators,
              });

          } catch (error) {
              console.error("Failed to fetch form data", error);
          } finally {
              setIsDataLoading(false);
          }
      };
      
      if(user?.uid) {
        fetchData(user.uid);
      }

    return () => unsubscribe();
  }, [router, user?.uid]);

  async function processForm(data: FormData) {
      if (!user || !profile) {
          toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
          return;
      }
      try {
          const dataToSave = JSON.parse(JSON.stringify(data));
          if (dataToSave.orderDetails.loadingDate) {
              dataToSave.orderDetails.loadingDate = formatISO(dataToSave.orderDetails.loadingDate);
          }
          const companyName = profile.tradingName || profile.name;
          const newId = await addCompleteFreight(user.uid, companyName, freightType, dataToSave);
          setGeneratedId(newId);
          setIsSummaryOpen(false);
          setIsSuccessOpen(true);
          reset(initialValues);
          setCurrentStep(0);
      } catch (error) {
           toast({
              variant: "destructive",
              title: "Erro ao Enviar",
              description: error instanceof Error ? error.message : 'Não foi possível salvar sua solicitação. Tente novamente.'
          })
          setIsSummaryOpen(false);
      }
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
      setIsSummaryOpen(true);
    }
  };
  
   const handleEditFromSummary = (stepIndex: number) => {
      setIsSummaryOpen(false);
      setCurrentStep(stepIndex);
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(step => step - 1);
       window.scrollTo(0, 0);
    }
  };
  
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSuccessOpen && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (isSuccessOpen && countdown === 0) {
      router.push('/profile');
    }
    return () => clearTimeout(timer);
  }, [isSuccessOpen, countdown, router]);
  
  const progress = ((currentStep + 1) / (steps.length || 1)) * 100;
  
  const pageTitle = freightType === 'retorno' ? 'Frete de Retorno' : 'Frete Completo';

  if (isLoading) {
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
    <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
             <div className="mb-8">
                 <Button asChild variant="outline" className="mb-4">
                    <Link href="/fretes/solicitar">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar
                    </Link>
                </Button>
            </div>
             <div className="text-center mb-12">
                <h1 className="text-4xl font-bold font-headline text-primary">{pageTitle}</h1>
                <p className="mt-2 text-lg text-foreground/70">
                    Você está cadastrando um novo <span className="font-semibold text-foreground">{pageTitle}</span>.
                </p>
            </div>

             <Card className="shadow-lg">
              <CardHeader>
                 <div className="mb-4">
                    <p className="text-sm text-muted-foreground">Etapa {currentStep + 1} de {steps.length || 1}: {steps[currentStep]?.name}</p>
                    <Progress value={progress} className="mt-2" />
                </div>
              </CardHeader>
              <CardContent>
                  <FormProvider {...methods}>
                      <form onSubmit={handleSubmit(processForm)}>
                          <div className={currentStep === 0 ? 'block' : 'hidden'}> <StepCollaborators companyId={user.uid} /> </div>
                          <div className={currentStep === 1 ? 'block' : 'hidden'}> <StepRoute /> </div>
                          <div className={currentStep === 2 ? 'block' : 'hidden'}> <StepOrderDetails /> </div>
                          <div className={currentStep === 3 ? 'block' : 'hidden'}> {isDataLoading ? <Loader2 className="animate-spin" /> : <StepVehicleAndBodywork allData={allData} />}</div>
                      </form>
                  </FormProvider>

                  <div className="mt-8 flex justify-between">
                      <Button onClick={prevStep} variant="outline" disabled={currentStep === 0 || isSubmitting}>
                          Voltar
                      </Button>
                      <Button onClick={nextStep} disabled={isSubmitting || !user || (currentStep === 0 && allData.collaborators.length === 0) || ((currentStep ===3) && isDataLoading)}>
                          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {currentStep < steps.length - 1 ? 'Próximo' : 'Revisar Solicitação'}
                      </Button>
                  </div>
              </CardContent>
            </Card>
        </div>
    </div>
    
    <Dialog open={isSummaryOpen} onOpenChange={setIsSummaryOpen}>
        <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                <DialogTitle className="text-2xl">Confirme sua Solicitação</DialogTitle>
                <p className="text-sm text-muted-foreground">
                    Por favor, revise todos os dados antes de finalizar.
                </p>
                </DialogHeader>
                <SummaryView data={getValues()} onEdit={handleEditFromSummary} allData={allData} companyId={user.uid} freightType={freightType} />
                <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancelar</Button>
                </DialogClose>
                <Button onClick={handleSubmit(processForm)} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Finalizar e Publicar
                </Button>
                </DialogFooter>
        </DialogContent>
    </Dialog>
    
    <Dialog open={isSuccessOpen} onOpenChange={(open) => { if (!open) router.push('/profile')}}>
        <DialogContent>
                <DialogHeader>
                <div className="flex flex-col items-center text-center gap-4 py-4">
                    <CheckCircle className="h-16 w-16 text-green-500" />
                    <DialogTitle className="text-2xl">Frete Publicado com Sucesso!</DialogTitle>
                    <p className="text-muted-foreground">Sua solicitação já está ativa na plataforma para os motoristas visualizarem.</p>
                     <div className="bg-muted rounded-md p-3 w-full text-center mt-2 space-y-2 max-h-40 overflow-y-auto">
                        <p className="text-sm font-semibold">Código do Frete:</p>
                        <p className="font-mono font-bold text-primary">{generatedId}</p>
                    </div>
                </div>
                </DialogHeader>
                <DialogFooter className="sm:justify-between gap-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin"/>
                        <span>Redirecionando em {countdown}s...</span>
                    </div>
                    <Button onClick={() => router.push('/profile')}>Ir para o Painel</Button>
                </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}


