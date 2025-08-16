'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getFreightsByCompany, type Freight } from '@/app/actions';
import { Loader2, ArrowLeft } from 'lucide-react';
import MyFreightsClient from './my-freights-client';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';

export default function MyFreightsPage() {
    const [initialFreights, setInitialFreights] = useState<Freight[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const { user, isAuthenticated, isLoading: authLoading, role } = useAuth();

    useEffect(() => {
        if (authLoading || !isAuthenticated || !user) return;

        const fetchFreights = async () => {
            try {
                const freights = await getFreightsByCompany(user.uid);
                setInitialFreights(freights);
            } catch (error) {
                console.error("Failed to fetch freights", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchFreights();
    }, [user, isAuthenticated, authLoading]);

    // Se estiver carregando autenticação, mostrar loading
    if (authLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Verificando autenticação...</p>
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

    // Se estiver carregando fretes, mostrar loading
    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Carregando fretes...</p>
                </div>
            </div>
        );
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
                </div>
                <MyFreightsClient initialFreights={initialFreights} />
            </div>
        </div>
    );
}
