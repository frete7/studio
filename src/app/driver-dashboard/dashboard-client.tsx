
'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { User, Clock, ShieldCheck, Edit, Search, ArrowRight, FileText, Gift, MessageSquareWarning, LifeBuoy, ClipboardList, Map, Bell } from "lucide-react";
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';

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
        href: "/driver-dashboard/suggestions",
        icon: <MessageSquareWarning className="h-6 w-6 text-primary" />,
    },
     {
        title: "Suporte",
        description: "Precisa de ajuda? Entre em contato com nossa equipe de suporte.",
        href: "/support",
        icon: <LifeBuoy className="h-6 w-6 text-primary" />,
    },
]

export default function DashboardClient({ initialProfile }: { initialProfile: UserProfile }) {
    const router = useRouter();
    const { profile, isLoading, isAuthenticated, role, status } = useAuth();

    // Usar o perfil do hook se disponível, senão usar o inicial
    const currentProfile = profile || initialProfile;

    // Verificar se o usuário tem acesso
    if (!isLoading && (!isAuthenticated || role !== 'driver')) {
        router.push('/login');
        return null;
    }

    // Verificar se o perfil está pendente de aprovação
    if (status === 'pending') {
        return (
            <div className="text-center py-12">
                <ShieldCheck className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Aguardando Aprovação</h2>
                <p className="text-muted-foreground mb-4">
                    Seu perfil está sendo analisado pela nossa equipe. 
                    Você receberá uma notificação assim que for aprovado.
                </p>
                <Button variant="outline" onClick={() => router.push('/profile')}>
                    <Edit className="mr-2 h-4 w-4" />
                    Completar Perfil
                </Button>
            </div>
        );
    }

    // Verificar se o perfil está bloqueado
    if (status === 'blocked' || status === 'suspended') {
        return (
            <div className="text-center py-12">
                <ShieldCheck className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Conta Bloqueada</h2>
                <p className="text-muted-foreground mb-4">
                    Sua conta foi bloqueada. Entre em contato com o suporte para mais informações.
                </p>
                <Button variant="outline" onClick={() => router.push('/support')}>
                    <LifeBuoy className="mr-2 h-4 w-4" />
                    Contatar Suporte
                </Button>
            </div>
        );
    }

    // Verificar se o perfil está incompleto
    if (status === 'incomplete') {
        return (
            <div className="text-center py-12">
                <Edit className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Perfil Incompleto</h2>
                <p className="text-muted-foreground mb-4">
                    Complete seu perfil para começar a usar a plataforma.
                </p>
                <Button onClick={() => router.push('/profile')}>
                    <Edit className="mr-2 h-4 w-4" />
                    Completar Perfil
                </Button>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Carregando...</p>
                </div>
            </div>
        );
    }

    if (!currentProfile) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">Perfil não encontrado.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header do Dashboard */}
            <div className="text-center">
                <h1 className="text-3xl font-bold font-headline text-primary mb-2">
                    Bem-vindo, {currentProfile.name}!
                </h1>
                <p className="text-foreground/70">
                    Gerencie seus fretes, rotas e perfil profissional
                </p>
                {currentProfile.status === 'active' && (
                    <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-green-50 text-green-700 rounded-full">
                        <ShieldCheck className="h-4 w-4" />
                        <span className="text-sm font-medium">Conta Ativa</span>
                    </div>
                )}
            </div>

            {/* Cards do Dashboard */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {dashboardCards.map((card, index) => (
                    <Card key={`${card.href}-${index}`} className="hover:shadow-lg transition-all duration-300">
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                                {card.icon}
                                <CardTitle className="text-lg">{card.title}</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="pb-4">
                            <CardDescription className="text-sm leading-relaxed">
                                {card.description}
                            </CardDescription>
                        </CardContent>
                        <CardFooter>
                            <Button asChild className="w-full" variant="outline">
                                <Link href={card.href}>
                                    Acessar
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            {/* Seção de Status Rápido */}
            <Card className="bg-muted/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Status Rápido
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-primary">0</div>
                            <div className="text-sm text-muted-foreground">Fretes Ativos</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">0</div>
                            <div className="text-sm text-muted-foreground">Fretes Concluídos</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">0</div>
                            <div className="text-sm text-muted-foreground">Propostas Enviadas</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
