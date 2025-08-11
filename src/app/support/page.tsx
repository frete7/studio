
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SupportClient from './support-client';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { type SupportChatMessage } from '../actions';
import { useToast } from '@/hooks/use-toast';

export default function SupportPage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [messages, setMessages] = useState<SupportChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const q = query(collection(db, 'users', currentUser.uid, 'supportChat'), orderBy('createdAt', 'asc'));
                
                const unsubscribeChat = onSnapshot(q, (snapshot) => {
                    const loadedMessages: SupportChatMessage[] = [];
                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        loadedMessages.push({
                            id: doc.id,
                            ...data,
                            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                        } as SupportChatMessage);
                    });
                    setMessages(loadedMessages);
                    setIsLoading(false);
                }, (error) => {
                    console.error("Error fetching chat: ", error);
                    toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar o chat.'});
                    setIsLoading(false);
                });

                return () => unsubscribeChat();
            } else {
                router.push('/login');
                setIsLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, [router, toast]);

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
                        Converse com nossa equipe para tirar dúvidas ou resolver problemas.
                    </p>
                </div>
                <SupportClient userId={user.uid} initialMessages={messages} />
            </div>
        </div>
    );
}
