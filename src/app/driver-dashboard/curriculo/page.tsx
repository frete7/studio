
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CurriculoClient from './curriculo-client';

export default function CurriculoPage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                const userDocRef = doc(db, 'users', currentUser.uid);
                const unsubSnapshot = onSnapshot(userDocRef, (doc) => {
                    if (doc.exists()) {
                        setUser(currentUser);
                        setProfile({ uid: doc.id, ...doc.data() });
                    } else {
                        router.push('/login');
                    }
                    setIsLoading(false);
                });
                return () => unsubSnapshot();
            } else {
                router.push('/login');
                setIsLoading(false);
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
    
    if (!user || !profile) {
        return null; // Or a more elaborate loading/error state
    }

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="max-w-4xl mx-auto">
                 <div className="mb-8">
                     <Button asChild variant="outline" className="mb-4">
                        <Link href="/driver-dashboard">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Voltar para o Painel
                        </Link>
                    </Button>
                </div>
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold font-headline text-primary">Meu Currículo</h1>
                    <p className="mt-2 text-lg text-foreground/70">
                        Mantenha suas informações atualizadas para atrair as melhores oportunidades.
                    </p>
                </div>
                <CurriculoClient profile={profile} />
            </div>
        </div>
    );
}
