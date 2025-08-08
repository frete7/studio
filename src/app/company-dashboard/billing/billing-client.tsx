
'use client';

import { useState } from 'react';
import { type Plan } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CheckCircle, CreditCard, Star } from 'lucide-react';

type BillingClientProps = {
    allPlans: Plan[];
    currentPlanId?: string;
};

export default function BillingClient({ allPlans, currentPlanId }: BillingClientProps) {
    const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>(currentPlanId);
    const [isLoading, setIsLoading] = useState(false);

    const formatCurrency = (value: number) => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    
    // Feature list could be dynamic in a real app
    const planFeatures = [
        "Publicação de Fretes Ilimitada",
        "Acesso ao Otimizador de Rotas",
        "Dashboard de Estatísticas",
        "Suporte Prioritário",
        "Verificação de Motoristas (Beta)"
    ];

    const handleSelectPlan = (planId: string) => {
        setSelectedPlanId(planId);
        // Here you would typically initiate a checkout process
        console.log("Selected plan:", planId);
    };

    const renderPlans = () => {
        if (!allPlans || allPlans.length === 0) {
            return (
                <Card className="text-center p-8">
                    <CardTitle>Nenhum Plano Disponível</CardTitle>
                    <CardDescription className="mt-2">
                        No momento não há planos disponíveis. Por favor, volte mais tarde.
                    </CardDescription>
                </Card>
            )
        }

        return (
             <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {allPlans.map((plan, index) => {
                    const isCurrent = plan.id === currentPlanId;
                    const isPopular = index === 1; // Example logic to make one plan "popular"

                    return (
                        <Card key={plan.id} className={cn("flex flex-col", isCurrent && "border-primary border-2", isPopular && "shadow-lg")}>
                            {isPopular && (
                                <div className="bg-primary text-primary-foreground text-center text-sm font-bold py-1 rounded-t-lg">
                                    Mais Popular
                                </div>
                            )}
                            <CardHeader className="items-center text-center">
                                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                                <CardDescription>{plan.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-6">
                                <div className="text-center">
                                    <span className="text-4xl font-bold">{formatCurrency(plan.pricePix)}</span>
                                    <span className="text-muted-foreground">/mês</span>
                                </div>
                                <ul className="space-y-3 text-sm">
                                    {planFeatures.map((feature, i) => (
                                        <li key={i} className="flex items-center gap-2">
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                            <span className="text-muted-foreground">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Button
                                    className="w-full"
                                    disabled={isCurrent || isLoading}
                                    onClick={() => handleSelectPlan(plan.id)}
                                >
                                    {isCurrent ? 'Plano Atual' : 'Selecionar Plano'}
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div className="text-center">
                <h1 className="text-4xl font-bold font-headline text-primary">Planos e Assinatura</h1>
                <p className="mt-2 text-lg text-foreground/70">
                    Escolha o plano que melhor se adapta às necessidades da sua empresa.
                </p>
            </div>
            
            {renderPlans()}

            <Card className="mt-12">
                <CardHeader>
                    <CardTitle>Gerenciar Pagamentos</CardTitle>
                    <CardDescription>Acesse seu histórico de faturas e atualize seu método de pagamento.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">O seu plano atual é o <span className="font-semibold text-primary">{allPlans.find(p => p.id === currentPlanId)?.name || 'Básico'}</span>.</p>
                </CardContent>
                <CardFooter>
                    <Button variant="outline">
                        <CreditCard className="mr-2 h-4 w-4" />
                        Portal de Pagamentos
                    </Button>
                </CardFooter>
            </Card>

        </div>
    );
}

