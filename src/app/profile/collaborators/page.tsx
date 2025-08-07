
'use client';
import type { Metadata } from 'next';
import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import CollaboratorsClient from './collaborators-client';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/*
export const metadata: Metadata = {
    title: 'Gerenciamento de Colaboradores | Frete7',
    description: 'Adicione, edite e gerencie os colaboradores da sua empresa.',
};
*/


export default function CollaboratorsPage() {
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
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                     <Button asChild variant="outline" className="mb-4">
                        <Link href="/profile">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Voltar para o Painel
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold font-headline text-primary">Gerenciamento de Colaboradores</h1>
                    <p className="text-foreground/70">Adicione, edite ou remova os colaboradores responsáveis pelo contato dos fretes.</p>
                </div>
                <CollaboratorsClient companyId={user.uid} />
            </div>
        </div>
    );
}
