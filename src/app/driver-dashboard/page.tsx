
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

import { Loader2 } from "lucide-react";
import DashboardClient from './dashboard-client';

type UserProfile = {
    uid: string;
    name: string;
    email: string;
    role: 'driver' | 'company' | 'admin';
    status: 'incomplete' | 'pending' | 'active' | 'blocked' | 'suspended';
    [key: string]: any;
}

export default function DriverDashboardPage() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    // Memoizar perfil para evitar re-renderizações
    const memoizedProfile = useMemo(() => profile, [profile]);

    // Otimizar verificação de autenticação
    useEffect(() => {
        let isMounted = true;
        
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (!isMounted) return;
            
            if (currentUser) {
                const userDocRef = doc(db, 'users', currentUser.uid);
                try {
                    const docSnap = await getDoc(userDocRef);

                    if (isMounted && docSnap.exists()) {
                        const userProfile = { ...docSnap.data(), uid: docSnap.id } as UserProfile;
                        setProfile(userProfile);

                        if (userProfile.role !== 'driver') {
                            router.push('/company-dashboard');
                            return;
                        }
                    } else if (isMounted) {
                        router.push('/login'); 
                    }
                } catch (error) {
                    console.error('Error fetching user profile:', error);
                    if (isMounted) router.push('/login');
                }
                
                if (isMounted) setIsLoading(false);
            } else {
                if (isMounted) {
                    router.push('/login');
                    setIsLoading(false);
                }
            }
        });

        return () => {
            isMounted = false;
            unsubscribeAuth();
        };
    }, [router]);

    // Memoizar loading state
    const loadingComponent = useMemo(() => (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    ), []);
  
    if (isLoading) {
        return loadingComponent;
    }
  
    if (!memoizedProfile) {
        return null;
    }

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="max-w-6xl mx-auto">
                <DashboardClient initialProfile={memoizedProfile} />
            </div>
        </div>
    );
}
