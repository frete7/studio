
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import AgregamentoClient from './agregamento-client';

export default function AgregamentoPage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
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
        return null; // or a login prompt
    }

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="max-w-3xl mx-auto">
                 <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold font-headline text-primary">Solicitar Agregamento</h1>
                    <p className="mt-2 text-lg text-foreground/70">
                        Preencha o formulário para encontrar o veículo ideal para sua operação.
                    </p>
                </div>
                <AgregamentoClient companyId={user.uid} />
            </div>
        </div>
    );
}
