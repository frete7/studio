
'use client';

import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import CollaboratorsClient from './collaborators-client';
import { useAuth } from '@/hooks/use-auth';

export default function CollaboratorsPage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading, role } = useAuth();

    // Se estiver carregando, mostrar loading
    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Carregando...</p>
                </div>
            </div>
        );
    }

    // Verificar se o usuário tem acesso
    if (!isAuthenticated || !user) {
        router.push('/login');
        return null;
    }

    // Verificar se o usuário é uma empresa
    if (role !== 'company') {
        router.push('/driver-dashboard');
        return null;
    }

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <Button asChild variant="outline" className="mb-4">
                        <Link href="/company-dashboard">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Voltar para o Painel
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold font-headline text-primary">Gerenciamento de Colaboradores</h1>
                    <p className="text-foreground/70">Adicione, edite ou remova os colaboradores responsáveis pelo contato dos fretes.</p>
                </div>
                <CollaboratorsClient companyId={user.uid} />
            </div>
        </div>
    );
}
