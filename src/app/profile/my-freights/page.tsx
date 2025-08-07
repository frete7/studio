
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { getFreightsByCompany, type Freight } from '@/app/actions';
import { Loader2 } from 'lucide-react';
import MyFreightsClient from './my-freights-client';

export default function MyFreightsPage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [initialFreights, setInitialFreights] = useState<Freight[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                try {
                    const freights = await getFreightsByCompany(currentUser.uid);
                    setInitialFreights(freights);
                } catch (error) {
                    console.error("Failed to fetch freights", error);
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
    
    if (!user) {
        return null;
    }

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="max-w-6xl mx-auto">
                <MyFreightsClient initialFreights={initialFreights} />
            </div>
        </div>
    );
}
