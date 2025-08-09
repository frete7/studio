
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { User, Clock, ShieldCheck, Loader2, Edit, Search, ArrowRight } from "lucide-react";
import { Button } from '@/components/ui/button';
import Link from 'next/link';


type UserProfile = {
    uid: string;
    name: string;
    email: string;
    role: 'driver' | 'company' | 'admin';
    status: 'incomplete' | 'pending' | 'active' | 'blocked' | 'suspended';
    [key: string]: any;
}


export default function DriverDashboardPage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();


    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const userDocRef = doc(db, 'users', currentUser.uid);
                
                const unsubscribeSnapshot = onSnapshot(userDocRef, (doc) => {
                    if (doc.exists()) {
                        const userProfile = { ...doc.data(), uid: doc.id } as UserProfile;
                        setProfile(userProfile);

                        if (userProfile.role !== 'driver') {
                            router.push('/company-dashboard'); // Or a generic home
                            return;
                        }

                    } else {
                        router.push('/login'); 
                    }
                    setIsLoading(false);
                });

                return () => unsubscribeSnapshot();
            } else {
                router.push('/login');
            }
        });

        return () => unsubscribeAuth();

    }, [router]);


    const renderContent = () => {
        if (isLoading || !profile) {
            return (
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            );
        }

        switch (profile.status) {
            case 'pending':
                return (
                    <Card>
                        <CardHeader className="items-center text-center">
                             <Clock className="h-12 w-12 text-yellow-500 mb-4" />
                            <CardTitle className="text-2xl">Aguardando Verificação</CardTitle>
                            <CardDescription className="max-w-md">
                                Seus dados foram recebidos e estão em análise. Assim que seu perfil for aprovado, você poderá encontrar fretes e utilizar todas as funcionalidades.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                );
            case 'active':
                 return (
                    <div className='space-y-8'>
                        <div>
                             <h1 className="text-3xl font-bold font-headline text-primary">Painel do Motorista</h1>
                             <p className="text-foreground/70">Bem-vindo, {profile.name}! Tudo pronto para a estrada.</p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
                            <Card className="flex flex-col">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Search className="h-5 w-5 text-primary" />
                                        Buscar Fretes
                                    </CardTitle>
                                    <CardDescription>
                                       Encontre as melhores oportunidades de frete em todo o Brasil.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <p className='text-sm text-muted-foreground'>Filtre por rota, tipo de carga e valor para encontrar o frete ideal.</p>
                                </CardContent>
                                <CardFooter>
                                    <Button asChild className='w-full'>
                                        <Link href="/fretes">
                                            Procurar Fretes <ArrowRight className="ml-2 h-4 w-4"/>
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <ShieldCheck className="h-5 w-5 text-green-500" />
                                        Perfil Ativo
                                    </CardTitle>
                                    <CardDescription>
                                        Seu perfil está verificado e ativo na plataforma.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className='text-sm text-muted-foreground'>Mantenha seus dados e documentos sempre atualizados.</p>
                                </CardContent>
                                <CardFooter>
                                    <Button asChild variant="outline" className='w-full'>
                                        <Link href="/profile">
                                            <Edit className="mr-2 h-4 w-4" />
                                            Visualizar e Editar Perfil
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        </div>
                    </div>
                );
            default:
                return (
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5 text-primary" />
                                Status do Perfil: {profile.status}
                            </CardTitle>
                             <CardDescription>
                                Há um problema com seu perfil. Entre em contato com o suporte.
                             </CardDescription>
                        </CardHeader>
                     </Card>
                )
        }
    }

  return (
    <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
            {renderContent()}
        </div>
    </div>
  );
}
