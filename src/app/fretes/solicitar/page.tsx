
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import CommonFreightForm from '@/app/solicitar-frete/common-freight-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Box, CornerDownLeft, Truck } from 'lucide-react';

export default function RequestFreightRouterPage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                if (userDoc.exists()) {
                    setProfile(userDoc.data());
                }
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    // Se o usuário não estiver logado, mostre diretamente o formulário comum.
    if (!user) {
        return (
            <div className="container mx-auto px-4 py-12">
                <div className="max-w-3xl mx-auto">
                     <div className="text-center mb-12">
                        <h1 className="text-4xl font-bold font-headline text-primary">Solicitar um Frete</h1>
                        <p className="mt-2 text-lg text-foreground/70">
                            Preencha os detalhes abaixo e encontre o transportador ideal para sua carga.
                        </p>
                    </div>
                    <CommonFreightForm companyId={null} companyName="Visitante" />
                </div>
            </div>
        );
    }

    // Se o usuário estiver logado, ofereça a escolha.
    return (
        <div className="container mx-auto px-4 py-12">
            <div className="max-w-4xl mx-auto">
                 <div className="mb-8">
                     <Button asChild variant="outline">
                        <Link href="/company-dashboard">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Voltar para o Painel
                        </Link>
                    </Button>
                </div>
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold font-headline text-primary">Solicitar um Frete</h1>
                    <p className="mt-2 text-lg text-foreground/70">
                        Qual tipo de frete você precisa? Escolha uma das opções abaixo para começar.
                    </p>
                </div>
                <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-8">
                     <Card className="flex flex-col text-center hover:shadow-xl transition-shadow">
                        <CardHeader className="items-center">
                            <div className="p-3 bg-muted rounded-full mb-4">
                                <Truck className="h-10 w-10 text-blue-500" />
                            </div>
                            <CardTitle>Agregamento</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <CardDescription>
                                Contrate um veículo fixo para suas entregas recorrentes.
                            </CardDescription>
                        </CardContent>
                        <div className="p-6 pt-0">
                             <Button asChild className="w-full bg-blue-500 hover:bg-blue-600">
                                <Link href="/solicitar-frete/agregamento">Solicitar Agregamento</Link>
                            </Button>
                        </div>
                     </Card>
                     <Card className="flex flex-col text-center hover:shadow-xl transition-shadow">
                        <CardHeader className="items-center">
                            <div className="p-3 bg-muted rounded-full mb-4">
                                <Box className="h-10 w-10 text-green-500" />
                            </div>
                            <CardTitle>Frete Completo</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <CardDescription>
                                Envie uma carga que ocupa todo o espaço do veículo.
                            </CardDescription>
                        </CardContent>
                        <div className="p-6 pt-0">
                            <Button asChild className="w-full bg-green-500 hover:bg-green-600">
                                <Link href="/solicitar-frete/empresa?type=completo">Solicitar Frete Completo</Link>
                            </Button>
                        </div>
                     </Card>
                      <Card className="flex flex-col text-center hover:shadow-xl transition-shadow">
                        <CardHeader className="items-center">
                             <div className="p-3 bg-muted rounded-full mb-4">
                                <CornerDownLeft className="h-10 w-10 text-orange-500" />
                            </div>
                            <CardTitle>Frete de Retorno</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <CardDescription>
                                Anuncie uma carga para um motorista que já está voltando para sua região.
                            </CardDescription>
                        </CardContent>
                        <div className="p-6 pt-0">
                            <Button asChild className="w-full bg-orange-500 hover:bg-orange-600">
                                <Link href="/solicitar-frete/empresa?type=retorno">Solicitar Frete de Retorno</Link>
                            </Button>
                        </div>
                     </Card>
                </div>
            </div>
        </div>
    );
}
