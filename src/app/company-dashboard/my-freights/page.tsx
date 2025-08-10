'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { getFreightsByCompany, type Freight } from '@/app/actions';
import { Loader2, ArrowLeft } from 'lucide-react';
import MyFreightsClient from './my-freights-client';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

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
    
    if (!user) {
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
                <MyFreightsClient initialFreights={initialFreights} />
            </div>
        </div>
    );
}
