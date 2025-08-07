
'use client';

import { useState, useEffect } from 'react';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
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
import { Loader2, User, Search } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

// =================================================================
// Schemas e Tipos
// =================================================================

const formSchema = z.object({
  responsibleCollaborators: z.array(z.string()).refine(value => value.some(item => item), {
    message: "Você deve selecionar pelo menos um colaborador.",
  }),
  // Outras etapas virão aqui
});

type FormData = z.infer<typeof formSchema>;

const steps = [
  { id: 1, name: 'Responsáveis', fields: ['responsibleCollaborators'] },
  { id: 2, name: 'Detalhes do Veículo', fields: [] },
  { id: 3, name: 'Rota e Operação', fields: [] },
  { id: 4, name: 'Requisitos Adicionais', fields: [] },
];

// =================================================================
// Componente da Etapa 1
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


// =================================================================
// Componente Principal
// =================================================================

export default function AgregamentoClient({ companyId }: { companyId: string }) {
  const [currentStep, setCurrentStep] = useState(0);
  
  const methods = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      responsibleCollaborators: [],
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
