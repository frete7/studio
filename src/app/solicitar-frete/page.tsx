
'use client';

import { useState, useEffect } from 'react';
import { useForm, FormProvider, useFormContext, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { onSnapshot, collection, query } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import Link from 'next/link';

import { type Collaborator } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Loader2, User, Search, PlusCircle, Trash2, ArrowLeft, Copy } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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


const formSchema = z.object({
  responsibleCollaborators: z.array(z.string()).refine(value => value.some(item => item), {
    message: "Você deve selecionar pelo menos um colaborador.",
  }),
  origin: locationSchema,
  destinations: z.array(destinationSchema).min(1, "Adicione pelo menos um destino."),
});

type FormData = z.infer<typeof formSchema>;
type IBGEState = { id: number; sigla: string; nome: string; };
type IBGECity = { id: number; nome: string; };

const steps = [
  { id: 1, name: 'Responsáveis', fields: ['responsibleCollaborators'] },
  { id: 2, name: 'Rota', fields: ['origin', 'destinations'] },
  // Futuros passos serão adicionados aqui
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

// =================================================================
// Componente Principal
// =================================================================

export default function RequestFreightPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const methods = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: 'onBlur',
    defaultValues: {
      responsibleCollaborators: [],
      origin: { state: '', city: '' },
      destinations: [{ state: '', city: '', stops: 1 }],
    }
  });

  const { handleSubmit, trigger, formState: { isSubmitting } } = methods;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  async function processForm(data: FormData) {
    console.log("Form data submitted:", data);
    // Logic to save data will be added here in future steps
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
  
  const progress = ((currentStep + 1) / (steps.length || 1)) * 100;

  if (isLoading) {
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  if (!user) {
    // Redirect or show login prompt if needed
    return <p>Por favor, faça login para continuar.</p>
  }

  return (
    <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
             <div className="mb-8">
                 <Button asChild variant="outline" className="mb-4">
                    <Link href="/profile">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar para o Painel
                    </Link>
                </Button>
            </div>
             <div className="text-center mb-12">
                <h1 className="text-4xl font-bold font-headline text-primary">Solicitar Frete</h1>
                <p className="mt-2 text-lg text-foreground/70">
                    Preencha o formulário para encontrar o motorista ideal para sua carga.
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
                          {/* Future steps will be rendered here */}
                      </form>
                  </FormProvider>

                  <div className="mt-8 flex justify-between">
                      <Button onClick={prevStep} variant="outline" disabled={currentStep === 0 || isSubmitting}>
                          Voltar
                      </Button>
                      <Button onClick={nextStep} disabled={isSubmitting || !user}>
                          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {currentStep < steps.length - 1 ? 'Próximo' : 'Enviar Solicitação'}
                      </Button>
                  </div>
              </CardContent>
            </Card>
        </div>
    </div>
  );
}
