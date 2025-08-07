
'use client';

import { useState, useEffect } from 'react';
import { useForm, FormProvider, useFormContext, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

import { type Collaborator } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Loader2, User, Search, PlusCircle, Trash2 } from 'lucide-react';
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

const formSchema = z.object({
  responsibleCollaborators: z.array(z.string()).refine(value => value.some(item => item), {
    message: "Você deve selecionar pelo menos um colaborador.",
  }),
  origin: locationSchema,
  destinations: z.array(locationSchema).min(1, "Adicione pelo menos um destino."),
  // Outras etapas virão aqui
});

type FormData = z.infer<typeof formSchema>;
type IBGEState = { id: number; sigla: string; nome: string; };
type IBGECity = { id: number; nome: string; };

const steps = [
  { id: 1, name: 'Responsáveis', fields: ['responsibleCollaborators'] },
  { id: 2, name: 'Rota', fields: ['origin', 'destinations'] },
  { id: 3, name: 'Detalhes do Veículo', fields: [] },
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
    const { control } = useFormContext();
    const { fields, append, remove } = useFieldArray({
        control,
        name: "destinations",
    });

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
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar outro destino
                </Button>
                 <FormField control={control} name="destinations" render={() => <FormMessage />} />
            </div>
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
