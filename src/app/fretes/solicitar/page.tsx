
import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Truck, Box, CornerDownLeft } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Solicitar Frete | Frete7',
    description: 'Escolha o tipo de frete que você deseja anunciar.',
};

const freightOptions = [
    {
        title: 'Agregamento',
        description: 'Contrate um veículo fixo para suas entregas recorrentes. Ideal para demandas constantes.',
        icon: <Truck className="h-10 w-10 text-primary" />,
        buttonText: 'Solicitar Agregamento',
        href: '/solicitar-frete/agregamento'
    },
    {
        title: 'Frete Completo',
        description: 'Envie uma carga que ocupa todo o espaço do veículo. Perfeito para grandes volumes.',
        icon: <Box className="h-10 w-10 text-primary" />,
        buttonText: 'Solicitar Frete Completo',
        href: '/solicitar-frete?type=completo'
    },
    {
        title: 'Frete de Retorno',
        description: 'Anuncie uma carga para um motorista que já está voltando para sua região. Mais econômico.',
        icon: <CornerDownLeft className="h-10 w-10 text-primary" />,
        buttonText: 'Solicitar Frete de Retorno',
        href: '/solicitar-frete?type=retorno'
    }
];

export default function RequestFreightTypePage() {
    return (
        <div className="container mx-auto px-4 py-12">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold font-headline text-primary">Solicitar um Frete</h1>
                    <p className="mt-2 text-lg text-foreground/70">
                        Qual tipo de frete você precisa? Escolha uma das opções abaixo para começar.
                    </p>
                </div>
                
                <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-8">
                    {freightOptions.map((option) => (
                        <Card key={option.title} className="flex flex-col text-center hover:shadow-xl transition-shadow">
                            <CardHeader className="items-center">
                                <div className="p-3 bg-muted rounded-full mb-4">
                                    {option.icon}
                                </div>
                                <CardTitle>{option.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <CardDescription>{option.description}</CardDescription>
                            </CardContent>
                            <div className="p-6 pt-0">
                                <Button asChild className="w-full">
                                    <Link href={option.href}>{option.buttonText}</Link>
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
