
'use client';

import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AnimatePresence, motion } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Form } from '@/components/ui/form';

// Step 1 Schema
const originSchema = z.object({
    state: z.string().min(1, "Estado é obrigatório"),
    city: z.string().min(1, "Cidade é obrigatória"),
    neighborhood: z.string().min(1, "Bairro é obrigatório"),
    locationType: z.enum(['casa', 'apartamento', 'sobrado'], {
        required_error: "Selecione o tipo de local"
    }),
    floor: z.string().min(1, "Andar é obrigatório"),
    accessType: z.enum(['elevador', 'escada', 'rampa']).optional(),
    distance: z.string().min(1, "Distância é obrigatória"),
    dateTime: z.date({
        required_error: "Data e hora são obrigatórios"
    }).refine(date => date > new Date(), {
        message: "A data deve ser no futuro"
    }),
}).refine(data => {
    if (data.floor !== 'terreo' && !data.accessType) {
        return false;
    }
    return true;
}, {
    message: "O tipo de acesso é obrigatório se não for no térreo",
    path: ["accessType"],
});

// Step 2 Schema
const destinationSchema = z.object({
  // Define destination fields here
});

// Main form schema
const formSchema = z.object({
  origin: originSchema,
  destinations: z.array(destinationSchema),
  // Add other steps schemas
});

type FormData = z.infer<typeof formSchema>;

const steps = [
  { id: 1, name: 'Origem', fields: ['state', 'city', 'neighborhood', 'locationType', 'floor', 'accessType', 'distance', 'dateTime'] },
  { id: 2, name: 'Destino(s)' },
  { id: 3, name: 'Itens' },
  { id: 4, name: 'Detalhes Finais' },
];

function OriginStep() {
    // This component will contain the form fields for Step 1
    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-semibold">1. Detalhes da Origem</h2>
            <p className="text-muted-foreground">Onde o frete será carregado?</p>
            {/* Form fields will go here */}
             <div className="p-4 border rounded-md bg-muted/50 text-center">
                <p>Campos do formulário da Etapa 1 aparecerão aqui.</p>
            </div>
        </div>
    )
}

function DestinationStep() {
     return (
        <div className="space-y-4">
            <h2 className="text-2xl font-semibold">2. Destino(s)</h2>
            <p className="text-muted-foreground">Para onde vamos levar?</p>
            <div className="p-4 border rounded-md bg-muted/50 text-center">
                <p>Campos do formulário da Etapa 2 aparecerão aqui.</p>
            </div>
        </div>
    )
}
function ItemsStep() {
     return (
        <div className="space-y-4">
            <h2 className="text-2xl font-semibold">3. Itens a Transportar</h2>
            <p className="text-muted-foreground">O que será transportado?</p>
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
            <div className="p-4 border rounded-md bg-muted/50 text-center">
                <p>Campos do formulário da Etapa 4 aparecerão aqui.</p>
            </div>
        </div>
    )
}


export default function RequestFreightPage() {
  const [currentStep, setCurrentStep] = useState(0);
  
  const methods = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const { handleSubmit, trigger } = methods;

  async function processForm(data: FormData) {
    console.log('Form data:', data);
    // Here you would typically send the data to your backend
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
                             <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentStep}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {currentStep === 0 && <OriginStep />}
                                    {currentStep === 1 && <DestinationStep />}
                                    {currentStep === 2 && <ItemsStep />}
                                    {currentStep === 3 && <AdditionalInfoStep />}
                                </motion.div>
                            </AnimatePresence>
                        </form>
                    </FormProvider>

                    <div className="mt-8 flex justify-between">
                        <Button onClick={prevStep} variant="outline" disabled={currentStep === 0}>
                            Voltar
                        </Button>
                        {currentStep < steps.length - 1 ? (
                            <Button onClick={nextStep}>
                                Próximo
                            </Button>
                        ) : (
                            <Button onClick={handleSubmit(processForm)}>
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
