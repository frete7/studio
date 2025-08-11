
'use client';

import { useState, useEffect } from 'react';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { User, Clock, ShieldCheck, Loader2, Edit, Search, ArrowRight, FileText, Gift, MessageSquareWarning, LifeBuoy, ClipboardList, Map, Bell } from "lucide-react";
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

const dashboardCards = [
    {
        title: "Meu Perfil",
        description: "Visualize e edite seus dados cadastrais, documentos e veículos.",
        href: "/profile",
        icon: <User className="h-6 w-6 text-primary" />,
    },
    {
        title: "Visualizar Fretes",
        description: "Encontre as melhores oportunidades de frete em todo o Brasil.",
        href: "/fretes",
        icon: <Search className="h-6 w-6 text-primary" />,
    },
    {
        title: "Notificações",
        description: "Configure alertas de fretes para as cidades do seu interesse.",
        href: "/driver-dashboard/notifications",
        icon: <Bell className="h-6 w-6 text-primary" />,
    },
    {
        title: "Cadastrar Volta",
        description: "Anuncie sua rota de retorno e encontre cargas para otimizar sua viagem.",
        href: "/driver-dashboard/cadastrar-volta",
        icon: <FileText className="h-6 w-6 text-primary" />,
    },
    {
        title: "Minhas Voltas Cadastradas",
        description: "Gerencie os anúncios de retorno que você publicou na plataforma.",
        href: "/driver-dashboard/my-returns",
        icon: <Map className="h-6 w-6 text-primary" />,
    },
    {
        title: "Meu Currículo",
        description: "Apresente sua experiência, qualificações e histórico para as empresas.",
        href: "/driver-dashboard/curriculo",
        icon: <ClipboardList className="h-6 w-6 text-primary" />,
    },
    {
        title: "Meus Planos",
        description: "Gerencie sua assinatura, veja os benefícios e o histórico de pagamentos.",
        href: "#", // Placeholder
        icon: <Gift className="h-6 w-6 text-primary" />,
    },
    {
        title: "Sugestões/Denúncias",
        description: "Envie suas sugestões para melhorarmos ou denuncie qualquer irregularidade.",
        href: "#", // Placeholder
        icon: <MessageSquareWarning className="h-6 w-6 text-primary" />,
    },
     {
        title: "Suporte",
        description: "Precisa de ajuda? Entre em contato com nossa equipe de suporte.",
        href: "#", // Placeholder
        icon: <LifeBuoy className="h-6 w-6 text-primary" />,
    },
]

export default function DashboardClient({ initialProfile }: { initialProfile: UserProfile }) {
    const [profile, setProfile] = useState<UserProfile>(initialProfile);
    const router = useRouter();

    useEffect(() => {
        if (!profile?.uid) return;

        const userDocRef = doc(db, 'users', profile.uid);
        const unsubscribeSnapshot = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
                const userProfile = { ...doc.data(), uid: doc.id } as UserProfile;
                setProfile(userProfile);
            }
        });

        return () => unsubscribeSnapshot();
    }, [profile?.uid]);

    if (!profile) {
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

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {dashboardCards.map(card => (
                            <Card key={card.title} className="flex flex-col">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-3">
                                        {card.icon}
                                        <span>{card.title}</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <CardDescription>{card.description}</CardDescription>
                                </CardContent>
                                <CardFooter>
                                    <Button asChild variant="outline" className="w-full">
                                        <Link href={card.href}>
                                            Acessar <ArrowRight className="ml-2 h-4 w-4"/>
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
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
