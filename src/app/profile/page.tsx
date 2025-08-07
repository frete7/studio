
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { User, Clock, ShieldCheck, Loader2, Users, ArrowRight, Package, ShieldAlert, Undo2 } from "lucide-react";
import CompanyProfileForm from './company-profile-form';
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


export default function ProfilePage() {
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

                        if (userProfile.role === 'admin') {
                            router.push('/admin');
                            return;
                        }
                        
                        const isProfilePage = window.location.pathname.startsWith('/profile');
                        const isAuthPage = window.location.pathname.startsWith('/login') || window.location.pathname.startsWith('/register');
                        const allowedPaths = isProfilePage || isAuthPage || window.location.pathname.startsWith('/api');

                        if ((userProfile.status === 'incomplete' || userProfile.status === 'pending') && !allowedPaths) {
                            router.push('/profile');
                        }

                    } else {
                        // Handle case where user exists in Auth but not Firestore
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
        if (isLoading) {
            return (
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            );
        }

        if (!profile) {
            return <p>Perfil não encontrado.</p>;
        }

        switch (profile.status) {
            case 'incomplete':
                return <CompanyProfileForm profile={profile} />;
            case 'pending':
                return (
                    <Card>
                        <CardHeader className="items-center text-center">
                             <Clock className="h-12 w-12 text-yellow-500 mb-4" />
                            <CardTitle className="text-2xl">Aguardando Verificação</CardTitle>
                            <CardDescription className="max-w-md">
                                Seus dados foram recebidos com sucesso! Nossa equipe está analisando suas informações e documentos.
                                Você será notificado por e-mail assim que a verificação for concluída.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                );
            case 'active':
                 return (
                    <div className='space-y-8'>
                        <div>
                             <h1 className="text-3xl font-bold font-headline text-primary">Painel da Empresa</h1>
                             <p className="text-foreground/70">Bem-vindo, {profile.tradingName || profile.name}! Gerencie sua operação aqui.</p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                                    <p className='text-sm text-muted-foreground'>Mantenha os dados da sua empresa sempre atualizados.</p>
                                </CardContent>
                                <CardFooter>
                                    <Button variant="outline" className='w-full' disabled>Editar Perfil</Button>
                                </CardFooter>
                            </Card>
                            <Card className="flex flex-col">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Users className="h-5 w-5 text-primary" />
                                        Colaboradores
                                    </CardTitle>
                                    <CardDescription>
                                        Adicione e gerencie os membros da sua equipe.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <p className='text-sm text-muted-foreground'>Controle as permissões de acesso dos seus funcionários.</p>
                                </CardContent>
                                <CardFooter>
                                    <Button asChild className='w-full'>
                                        <Link href="/profile/collaborators">
                                            Gerenciar Colaboradores <ArrowRight className="ml-2 h-4 w-4"/>
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                             <Card className="flex flex-col">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Package className="h-5 w-5 text-primary" />
                                        Fretes
                                    </CardTitle>
                                    <CardDescription>
                                        Anuncie e gerencie suas solicitações de frete.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <p className='text-sm text-muted-foreground'>Acompanhe o status de suas cargas em tempo real.</p>
                                </CardContent>
                                <CardFooter>
                                    <Button asChild className='w-full'>
                                        <Link href="/fretes/solicitar">
                                            Gerenciar Fretes <ArrowRight className="ml-2 h-4 w-4"/>
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                             <Card className="flex flex-col">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <ShieldAlert className="h-5 w-5 text-primary" />
                                        Verificar Motorista
                                    </CardTitle>
                                    <CardDescription>
                                       Consulte a situação de motoristas para mais segurança.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <p className='text-sm text-muted-foreground'>Verifique antecedentes e informações do motorista.</p>
                                </CardContent>
                                <CardFooter>
                                    <Button asChild className='w-full'>
                                        <Link href="#">
                                            Verificar Agora <ArrowRight className="ml-2 h-4 w-4"/>
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                             <Card className="flex flex-col">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Undo2 className="h-5 w-5 text-primary" />
                                        Motoristas Retornando
                                    </CardTitle>
                                    <CardDescription>
                                       Encontre motoristas que já estão voltando para sua região.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <p className='text-sm text-muted-foreground'>Aproveite fretes de retorno e economize nos custos.</p>
                                </CardContent>
                                <CardFooter>
                                    <Button asChild className='w-full'>
                                        <Link href="#">
                                            Encontrar Motoristas <ArrowRight className="ml-2 h-4 w-4"/>
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        </div>
                    </div>
                );
            case 'admin':
                return (
                    <Card>
                        <CardHeader>
                            <CardTitle>Painel do Administrador</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p>Bem-vindo, Administrador. Use o menu de navegação para gerenciar a plataforma.</p>
                             <Button asChild className="mt-4">
                                <Link href="/admin">Ir para o Painel de Admin</Link>
                            </Button>
                        </CardContent>
                    </Card>
                );
            default:
                return (
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5 text-primary" />
                                Meu Perfil
                            </CardTitle>
                            <CardDescription>
                                Mantenha suas informações sempre atualizadas. Status: {profile.status}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p>Conteúdo do perfil para status: {profile.status}</p>
                        </CardContent>
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
