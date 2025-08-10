
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { getCompanyStats, getMonthlyFreightStats } from '@/app/actions';
import StatisticsClient from './statistics-client';
import { Loader2 } from 'lucide-react';

export default function StatisticsPage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [monthlyStats, setMonthlyStats] = useState([]);
    const router = useRouter();

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                try {
                    const [companyData, monthlyData] = await Promise.all([
                        getCompanyStats(currentUser.uid),
                        getMonthlyFreightStats(currentUser.uid),
                    ]);
                    setStats(companyData as any);
                    setMonthlyStats(monthlyData as any);
                } catch (error) {
                    console.error("Failed to fetch stats on client", error);
                } finally {
                    setIsLoading(false);
                }
            } else {
                router.push('/login');
            }
        });

        return () => unsubscribeAuth();
    }, [router]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
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
