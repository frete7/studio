
'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import CommonFreightForm from './common-freight-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Box, CornerDownLeft } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export default function RequestFreightRouterPage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading, role } = useAuth();

    // Se estiver carregando, mostrar loading
    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Carregando...</p>
                </div>
            </div>
        );
    }

    // Se o usuário não estiver logado, mostrar formulário para visitantes
    if (!isAuthenticated || !user) {
        return (
            <div className="container mx-auto px-4 py-12">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-12">
                        <h1 className="text-4xl font-bold font-headline text-primary">Solicitar um Frete</h1>
                        <p className="mt-2 text-lg text-foreground/70">
                            Preencha os detalhes abaixo e encontre o transportador ideal para sua carga.
                        </p>
                    </div>
                    <CommonFreightForm companyId="unauthenticated" companyName="Visitante" />
                </div>
            </div>
        );
    }

    // Se o usuário estiver logado, oferecer escolha
    return (
        <div className="container mx-auto px-4 py-12">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <Button asChild variant="outline">
                        <Link href={role === 'company' ? '/company-dashboard' : '/driver-dashboard'}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Voltar para o Painel
                        </Link>
                    </Button>
                </div>
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold font-headline text-primary">Como você quer solicitar?</h1>
                    <p className="mt-2 text-lg text-foreground/70">
                        Você está logado. Anuncie como empresa para usar seus colaboradores e histórico, ou solicite um frete pessoal.
                    </p>
                </div>
                <div className="grid md:grid-cols-2 gap-8">
                    <Card className="flex flex-col text-center hover:shadow-xl transition-shadow">
                        <CardHeader className="items-center">
                            <div className="p-3 bg-muted rounded-full mb-4">
                                <Box className="h-10 w-10 text-green-500" />
                            </div>
                            <CardTitle>Anunciar como Empresa</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <CardDescription>
                                Use o formulário avançado, vincule colaboradores e gerencie o frete pelo seu painel.
                            </CardDescription>
                        </CardContent>
                        <div className="p-6 pt-0">
                            <Button asChild className="w-full bg-green-500 hover:bg-green-600">
                                <Link href="/solicitar-frete/empresa?type=completo">Frete Completo</Link>
                            </Button>
                        </div>
                    </Card>
                    <Card className="flex flex-col text-center hover:shadow-xl transition-shadow">
                        <CardHeader className="items-center">
                            <div className="p-3 bg-muted rounded-full mb-4">
                                <CornerDownLeft className="h-10 w-10 text-orange-500" />
                            </div>
                            <CardTitle>Frete Pessoal</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <CardDescription>
                                Solicite um frete para uso pessoal, sem vínculo com sua empresa.
                            </CardDescription>
                        </CardContent>
                        <div className="p-6 pt-0">
                            <Button asChild className="w-full bg-orange-500 hover:bg-orange-600">
                                <Link href="/solicitar-frete/pessoal">Solicitar Frete Pessoal</Link>
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
