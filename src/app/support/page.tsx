
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SupportClient from './support-client';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { type SupportChatMessage } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';

export default function SupportPage() {
    const [messages, setMessages] = useState<SupportChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const { toast } = useToast();
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();

    useEffect(() => {
        if (authLoading) return;

        if (!isAuthenticated || !user) {
            router.push('/login');
            return;
        }

        // Carregar mensagens do chat
        const q = query(
            collection(db, 'users', user.uid, 'supportChat'), 
            orderBy('createdAt', 'asc')
        );
        
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
            toast({ 
                variant: 'destructive', 
                title: 'Erro', 
                description: 'Não foi possível carregar o chat.'
            });
            setIsLoading(false);
        });

        return () => unsubscribeChat();
    }, [user, isAuthenticated, authLoading, router, toast]);

    // Se estiver carregando autenticação, mostrar loading
    if (authLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Verificando autenticação...</p>
                </div>
            </div>
        );
    }

    // Se não estiver autenticado, não mostrar nada (será redirecionado)
    if (!isAuthenticated || !user) {
        return null;
    }

    // Se estiver carregando mensagens, mostrar loading
    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Carregando chat...</p>
                </div>
            </div>
        );
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
