
'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { sendSupportChatMessage, type SupportChatMessage } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Paperclip, Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const replySchema = z.object({
    text: z.string().min(1, "A mensagem não pode estar vazia."),
    file: z.any()
        .optional()
        .refine((files) => !files || files.length === 0 || files[0].size <= 5 * 1024 * 1024, 'O arquivo deve ter no máximo 5MB.')
        .refine((files) => !files || files.length === 0 || ['image/jpeg', 'image/png', 'application/pdf'].includes(files[0].type), 'Apenas imagens (JPG, PNG) e PDF são permitidos.'),
});
type ReplyFormData = z.infer<typeof replySchema>;

const storage = getStorage();

export default function SupportClient({ userId }: { userId: string }) {
    const [messages, setMessages] = useState<SupportChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const replyForm = useForm<ReplyFormData>({ resolver: zodResolver(replySchema) });
    const attachedFile = replyForm.watch('file');

    useEffect(() => {
        if (!userId) return;
        setIsLoading(true);
        const q = query(collection(db, 'users', userId, 'supportChat'), orderBy('createdAt', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
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
        return () => unsubscribe();
    }, [userId, toast]);
    
    useEffect(() => {
        // Auto-scroll to bottom
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages]);

    const handleReplySubmit = async (data: ReplyFormData) => {
        setIsSubmitting(true);
        try {
            let fileUrl: string | undefined = undefined;
            if (data.file && data.file[0]) {
                const file = data.file[0];
                const filePath = `support_chats/${userId}/${Date.now()}_${file.name}`;
                const fileRef = ref(storage, filePath);
                await uploadBytes(fileRef, file);
                fileUrl = await getDownloadURL(fileRef);
            }
            await sendSupportChatMessage(userId, {
                text: data.text,
                sender: 'user',
                fileUrl: fileUrl,
            });
            replyForm.reset();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível enviar sua mensagem.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderChat = () => {
        if (isLoading) {
            return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
        }

        if (messages.length === 0) {
            return <div className="flex flex-col justify-center items-center h-full text-center text-muted-foreground"><p>Nenhuma mensagem ainda.</p><p>Envie sua primeira mensagem para iniciar a conversa.</p></div>;
        }
        
        return (
             <ScrollArea className="flex-1 p-4" ref={scrollAreaRef as any}>
                <div className="space-y-4">
                    {messages.map((msg) => (
                        <div key={msg.id} className={cn("flex items-end gap-2", msg.sender === 'user' ? 'justify-end' : 'justify-start')}>
                            {msg.sender === 'support' && <Avatar className="h-8 w-8"><AvatarFallback>S</AvatarFallback></Avatar>}
                            <div className={cn("rounded-lg px-3 py-2 max-w-[80%]", msg.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                                {msg.fileUrl && (
                                    <Link href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="block p-2 mb-1 bg-black/10 rounded-md hover:bg-black/20">
                                        <div className="flex items-center gap-2">
                                            <Paperclip className="h-4 w-4"/>
                                            <span className="text-sm font-medium underline">Ver Anexo</span>
                                        </div>
                                    </Link>
                                )}
                                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                <p className="text-xs opacity-70 mt-1 text-right">{format(msg.createdAt, 'HH:mm')}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        )
    }

    return (
        <Card className="h-[70vh] flex flex-col shadow-lg">
            <CardHeader className="border-b">
                <CardTitle>Chat com Suporte</CardTitle>
                <CardDescription>Nossa equipe responderá o mais breve possível.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
                {renderChat()}
                <div className="p-4 border-t bg-background">
                    <Form {...replyForm}>
                        <form onSubmit={replyForm.handleSubmit(handleReplySubmit)} className="space-y-2">
                            {attachedFile?.[0] && (
                                <div className="p-2 border rounded-md flex items-center justify-between bg-muted">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground truncate">
                                        <Paperclip className="h-4 w-4"/>
                                        <span className="truncate">{attachedFile[0].name}</span>
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => replyForm.setValue('file', null)}><X className="h-4 w-4"/></Button>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <FormField control={replyForm.control} name="text" render={({field}) => (
                                    <FormItem className="flex-1">
                                        <FormControl>
                                            <Input placeholder="Digite sua mensagem..." {...field}/>
                                        </FormControl>
                                    </FormItem>
                                )}/>
                                <FormField control={replyForm.control} name="file" render={({field: { onChange, value, ...fieldProps }}) => (
                                    <FormItem>
                                        <FormControl>
                                            <Button asChild size="icon" variant="outline" className="cursor-pointer">
                                                <div>
                                                    <Paperclip/>
                                                    <Input type="file" className="hidden" onChange={(e) => onChange(e.target.files)} {...fieldProps} />
                                                </div>
                                            </Button>
                                        </FormControl>
                                    </FormItem>
                                )} />
                                <Button type="submit" size="icon" disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </div>
            </CardContent>
        </Card>
    );
}
