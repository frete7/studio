
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCompanyStats, getMonthlyFreightStats } from '@/app/actions';
import StatisticsClient from './statistics-client';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export default function StatisticsPage() {
    const [stats, setStats] = useState(null);
    const [monthlyStats, setMonthlyStats] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const { user, isAuthenticated, isLoading: authLoading, role } = useAuth();

    useEffect(() => {
        if (authLoading || !isAuthenticated || !user) return;

        const fetchStats = async () => {
            try {
                const [companyData, monthlyData] = await Promise.all([
                    getCompanyStats(user.uid),
                    getMonthlyFreightStats(user.uid),
                ]);
                setStats(companyData as any);
                setMonthlyStats(monthlyData as any);
            } catch (error) {
                console.error("Failed to fetch stats on client", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
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

    // Se estiver carregando estatísticas, mostrar loading
    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Carregando estatísticas...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="max-w-6xl mx-auto">
                <StatisticsClient initialCompanyStats={stats} initialMonthlyStats={monthlyStats} />
            </div>
        </div>
    );
}
