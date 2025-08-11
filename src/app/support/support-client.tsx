
'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';

import { sendSupportChatMessage } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Paperclip, Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';


export type SupportChatMessage = {
  id: string;
  text: string;
  sender: 'user' | 'support';
  createdAt: any;
  fileUrl?: string;
};


const replySchema = z.object({
    text: z.string(),
    file: z.any()
        .optional()
        .refine((files) => !files || files.length === 0 || files[0].size <= 5 * 1024 * 1024, 'O arquivo deve ter no máximo 5MB.')
        .refine((files) => !files || files.length === 0 || ['image/jpeg', 'image/png', 'application/pdf'].includes(files[0].type), 'Apenas imagens (JPG, PNG) e PDF são permitidos.'),
}).refine(data => data.text.trim().length > 0 || (data.file && data.file.length > 0), {
    message: "A mensagem não pode estar vazia.",
    path: ["text"],
});

type ReplyFormData = z.infer<typeof replySchema>;

const storage = getStorage();

export default function SupportClient({ userId, initialMessages }: { userId: string, initialMessages: SupportChatMessage[] }) {
    const [messages, setMessages] = useState<SupportChatMessage[]>(initialMessages);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        setMessages(initialMessages);
    }, [initialMessages]);

    const replyForm = useForm<ReplyFormData>({ 
        resolver: zodResolver(replySchema),
        defaultValues: {
            text: '',
            file: undefined,
        }
    });
    const attachedFile = replyForm.watch('file');
    
    useEffect(() => {
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

            if (!data.text && !fileUrl) {
                toast({ variant: 'destructive', title: 'Erro', description: 'A mensagem não pode estar vazia.' });
                setIsSubmitting(false);
                return;
            }

            await sendSupportChatMessage(userId, {
                text: data.text,
                sender: 'user',
                fileUrl: fileUrl,
            });
            replyForm.reset({ text: '', file: undefined });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível enviar sua mensagem.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderChat = () => {
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
                                {msg.text && <p className="text-sm whitespace-pre-wrap">{msg.text}</p>}
                                <p className="text-xs opacity-70 mt-1 text-right">{format(msg.createdAt, 'HH:mm', { locale: ptBR })}</p>
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
                             <FormField control={replyForm.control} name="text" render={({fieldState}) => <FormMessage>{fieldState.error?.message}</FormMessage>} />
                        </form>
                    </Form>
                </div>
            </CardContent>
        </Card>
    );
}
