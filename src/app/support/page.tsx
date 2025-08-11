
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SupportClient from './support-client';
import { getSupportTicketsByUser, type SupportTicket } from '../actions';

export default function SupportPage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [initialTickets, setInitialTickets] = useState<SupportTicket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                try {
                    setUser(currentUser);
                    const userDocRef = doc(db, 'users', currentUser.uid);
                    const userDoc = await getDoc(userDocRef);
                    if (userDoc.exists()) {
                        setProfile(userDoc.data());
                        const tickets = await getSupportTicketsByUser(currentUser.uid);
                        setInitialTickets(tickets as SupportTicket[]);
                    } else {
                        router.push('/login');
                    }
                } catch (error) {
                    console.error("Error fetching initial data for support page: ", error);
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
    
    if (!user || !profile) {
        return null;
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
                    <h1 className="text-4xl font-bold font-headline text-primary">Central de Suporte</h1>
                    <p className="mt-2 text-lg text-foreground/70">
                        Veja seus chamados ou abra um novo ticket para nossa equipe.
                    </p>
                </div>
                <SupportClient 
                    userId={user.uid}
                    userProfile={profile}
                    initialTickets={initialTickets}
                />
            </div>
        </div>
    );
}
