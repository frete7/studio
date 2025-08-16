'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getPlans, type Plan } from '@/app/actions';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import BillingClient from './billing-client';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

type UserProfile = {
    activePlanId?: string;
    activePlanName?: string;
    [key: string]: any;
}

export default function BillingPage() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const { user, isAuthenticated, isLoading: authLoading, role } = useAuth();

    useEffect(() => {
        if (authLoading || !isAuthenticated || !user) return;

        const fetchBillingData = async () => {
            try {
                const [plansData, profileDoc] = await Promise.all([
                    getPlans(),
                    getDoc(doc(db, 'users', user.uid))
                ]);
                
                if (profileDoc.exists()) {
                    setProfile(profileDoc.data() as UserProfile);
                } else {
                    router.push('/login');
                    return;
                }
                setPlans(plansData.filter(p => p.userType === 'company'));
            } catch (error) {
                console.error("Failed to fetch billing data", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBillingData();
    }, [user, isAuthenticated, authLoading, router]);

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

    // Se estiver carregando dados de faturamento, mostrar loading
    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Carregando dados de faturamento...</p>
                </div>
            </div>
        );
    }

    if (!profile) return null;

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="max-w-6xl mx-auto">
                <BillingClient plans={plans} profile={profile} />
            </div>
        </div>
    );
}
