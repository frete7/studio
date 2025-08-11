
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NotificationsClient from './notifications-client';

export default function NotificationsPage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [settings, setSettings] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                try {
                    setUser(currentUser);
                    const settingsDocRef = doc(db, 'users', currentUser.uid, 'notification_settings', 'cities');
                    const settingsDoc = await getDoc(settingsDocRef);
                    setSettings(settingsDoc.exists() ? settingsDoc.data() : { cities: [] });
                } catch (error) {
                    console.error("Error fetching settings:", error);
                } finally {
                    setIsLoading(false);
                }
            } else {
                router.push('/login');
            }
        });

        return () => unsubscribe();
    }, [router]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!user || !settings) {
        return null;
    }

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="max-w-3xl mx-auto">
                 <div className="mb-8">
                     <Button asChild variant="outline" className="mb-4">
                        <Link href="/driver-dashboard">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Voltar para o Painel
                        </Link>
                    </Button>
                </div>
                 <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold font-headline text-primary">Alertas de Frete</h1>
                    <p className="mt-2 text-lg text-foreground/70">
                        Seja notificado sobre novos fretes nas cidades que você mais atua.
                    </p>
                </div>
                <NotificationsClient 
                    userId={user.uid} 
                    initialSettings={settings}
                />
            </div>
        </div>
    );
}
