
import { getCollaborators, type Collaborator } from '@/app/actions';
import CollaboratorsClient from './collaborators-client';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/lib/firebase';

// Since we cannot get the user on the server without a proper auth library,
// we must make this a client component to fetch data based on the logged-in user.
// To optimize, we could pass a server-fetched list and have the client re-fetch if needed,
// but for simplicity and correctness with Firebase Auth, client-side fetching is required here.
'use client';
import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';


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
                    <h1 className="text-3xl font-bold font-headline text-primary">Gerenciamento de Colaboradores</h1>
                    <p className="text-foreground/70">Adicione, edite ou remova os colaboradores responsáveis pelo contato dos fretes.</p>
                </div>
                <CollaboratorsClient companyId={user.uid} />
            </div>
        </div>
    );
}
