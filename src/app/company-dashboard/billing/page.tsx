
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { getPlans, type Plan } from '@/app/actions';
import { Loader2, ArrowLeft } from 'lucide-react';
import BillingClient from './billing-client';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type UserProfile = {
    activePlanId?: string;
    activePlanName?: string;
    [key: string]: any;
}

export default function BillingPage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                try {
                    const [plansData, profileDoc] = await Promise.all([
                        getPlans(),
                        getDoc(doc(db, 'users', currentUser.uid))
                    ]);
                    
                    if (profileDoc.exists()) {
                        setProfile(profileDoc.data() as UserProfile);
                    } else {
                         router.push('/login');
                    }

                    // Filter plans for company
                    setPlans(plansData.filter(p => p.userType === 'company'));

                } catch (error) {
                    console.error("Failed to fetch billing data", error);
                }
            } else {
                router.push('/login');
            }
            setIsLoading(false);
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
    
    if (!user || !profile) {
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
                </div>
                <BillingClient 
                    allPlans={plans} 
                    currentPlanId={profile.activePlanId}
                />
            </div>
        </div>
    );
}
