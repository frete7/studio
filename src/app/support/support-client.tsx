
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { onSnapshot, collection, query, where, doc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { createSupportTicket, addSupportTicketMessage, getSupportTicketMessages, type SupportTicket, type SupportMessage } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, PlusCircle, Paperclip, Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const newTicketSchema = z.object({
  title: z.string().min(5, { message: "O título deve ter pelo menos 5 caracteres." }),
  description: z.string().min(15, { message: "A descrição deve ter pelo menos 15 caracteres." }),
});
type NewTicketFormData = z.infer<typeof newTicketSchema>;

const replySchema = z.object({
    text: z.string().min(1, "A mensagem não pode estar vazia."),
    file: z.any().optional(),
});
type ReplyFormData = z.infer<typeof replySchema>;


const storage = getStorage();

export default function SupportClient({ userId, userProfile, initialTickets }: { userId: string, userProfile: any, initialTickets: SupportTicket[] }) {
    const [tickets, setTickets] = useState(initialTickets);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const { toast } = useToast();

    const newTicketForm = useForm<NewTicketFormData>({ resolver: zodResolver(newTicketSchema) });
    const replyForm = useForm<ReplyFormData>({ resolver: zodResolver(replySchema) });
    const attachedFile = replyForm.watch('file');

     useEffect(() => {
        if (!userId) return;
        const q = query(collection(db, 'support_tickets'), where('userId', '==', userId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const updatedTickets: SupportTicket[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                // Ensure timestamps are valid before trying to convert
                const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
                const lastUpdatedAt = data.lastUpdatedAt?.toDate ? data.lastUpdatedAt.toDate() : new Date();

                updatedTickets.push({ 
                    id: doc.id, 
                    ...data,
                    createdAt,
                    lastUpdatedAt,
                } as SupportTicket);
            });
            // Sort by last update date descending
            updatedTickets.sort((a, b) => b.lastUpdatedAt.getTime() - a.lastUpdatedAt.getTime());
            setTickets(updatedTickets);
        });
        return () => unsubscribe();
    }, [userId]);
    
    useEffect(() => {
        if (!selectedTicket) return;

        setIsLoadingMessages(true);
        const messagesQuery = query(collection(db, 'support_tickets', selectedTicket.id, 'messages'));
        const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
             const loadedMessages: SupportMessage[] = [];
             snapshot.forEach(doc => {
                 const data = doc.data();
                 loadedMessages.push({ 
                     id: doc.id, 
                     ...data,
                     createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                 } as SupportMessage)
             });
             loadedMessages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
             setMessages(loadedMessages);
             setIsLoadingMessages(false);
        });

        return () => unsubscribeMessages();

    }, [selectedTicket]);

    const handleNewTicketSubmit = async (data: NewTicketFormData) => {
        setIsSubmitting(true);
        try {
            await createSupportTicket(userId, userProfile, data);
            toast({ title: "Sucesso!", description: "Seu chamado foi aberto e nossa equipe responderá em breve." });
            setIsNewTicketOpen(false);
            newTicketForm.reset();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível abrir o chamado.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleReplySubmit = async (data: ReplyFormData) => {
        if (!selectedTicket) return;
        setIsSubmitting(true);

        try {
             let fileUrl: string | undefined = undefined;
            if (data.file && data.file[0]) {
                const file = data.file[0];
                const filePath = `support_tickets/${selectedTicket.id}/${Date.now()}_${file.name}`;
                const fileRef = ref(storage, filePath);
                await uploadBytes(fileRef, file);
                fileUrl = await getDownloadURL(fileRef);
            }

            await addSupportTicketMessage(selectedTicket.id, {
                text: data.text,
                sender: 'user',
                fileUrl: fileUrl,
            });
            replyForm.reset();
        } catch (error) {
             toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível enviar sua resposta.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'sua vez': return 'destructive';
            case 'concluido': return 'default';
            case 'analisando': return 'secondary';
            default: return 'outline';
        }
    }

    return (
        <>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Meus Chamados</CardTitle>
                <Dialog open={isNewTicketOpen} onOpenChange={setIsNewTicketOpen}>
                    <DialogTrigger asChild><Button><PlusCircle className="mr-2"/>Abrir Novo Chamado</Button></DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Abrir Novo Chamado</DialogTitle></DialogHeader>
                        <Form {...newTicketForm}>
                            <form onSubmit={newTicketForm.handleSubmit(handleNewTicketSubmit)} className="space-y-4">
                                <FormField control={newTicketForm.control} name="title" render={({field}) => <FormItem><FormLabel>Título</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>}/>
                                <FormField control={newTicketForm.control} name="description" render={({field}) => <FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea {...field} rows={5}/></FormControl><FormMessage/></FormItem>}/>
                                <DialogFooter>
                                    <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
                                    <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="animate-spin mr-2"/>} Enviar</Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {isLoading ? <Loader2 className="animate-spin"/> : (
                    tickets.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">Nenhum chamado encontrado.</p>
                    ) : (
                        <div className="space-y-4">
                            {tickets.map(ticket => (
                                <Card key={ticket.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedTicket(ticket)}>
                                    <CardContent className="p-4 flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold">{ticket.title}</p>
                                            <p className="text-sm text-muted-foreground">{ticket.protocol} - Atualizado {formatDistanceToNow(ticket.lastUpdatedAt, { addSuffix: true, locale: ptBR })}</p>
                                        </div>
                                        <Badge variant={getStatusVariant(ticket.status)}>{ticket.status}</Badge>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )
                )}
            </CardContent>
        </Card>
        
         {/* Chat Dialog */}
        <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
            <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{selectedTicket?.title}</DialogTitle>
                    <DialogDescription>{selectedTicket?.protocol}</DialogDescription>
                </DialogHeader>
                 <ScrollArea className="flex-1 -mx-6 px-6">
                    <div className="space-y-4 py-4">
                         {isLoadingMessages ? <Loader2 className="animate-spin" /> : messages.map((msg) => (
                            <div key={msg.id} className={cn("flex items-end gap-2", msg.sender === 'user' ? 'justify-end' : 'justify-start')}>
                                {msg.sender === 'support' && <Avatar className="h-8 w-8"><AvatarFallback>S</AvatarFallback></Avatar>}
                                <div className={cn("rounded-lg px-4 py-2 max-w-[80%]", msg.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                                    <p className="text-sm">{msg.text}</p>
                                    {msg.fileUrl && (
                                        <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline mt-1 block">
                                            Ver anexo
                                        </a>
                                    )}
                                    <p className="text-xs opacity-70 mt-1 text-right">{format(msg.createdAt, 'HH:mm')}</p>
                                </div>
                            </div>
                         ))}
                    </div>
                </ScrollArea>
                {selectedTicket?.status === 'sua vez' && (
                    <div className="mt-auto pt-4 border-t">
                        <Form {...replyForm}>
                            <form onSubmit={replyForm.handleSubmit(handleReplySubmit)} className="space-y-2">
                                {attachedFile?.[0] && (
                                    <div className="p-2 border rounded-md flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground truncate">
                                            <Paperclip className="h-4 w-4"/>
                                            <span className="truncate">{attachedFile[0].name}</span>
                                        </div>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => replyForm.setValue('file', null)}><X className="h-4 w-4"/></Button>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <FormField control={replyForm.control} name="text" render={({field}) => (
                                        <FormItem className="flex-1"><FormControl><Input placeholder="Digite sua resposta..." {...field}/></FormControl><FormMessage/></FormItem>
                                    )}/>
                                    <FormField control={replyForm.control} name="file" render={({field: { onChange, ...fieldProps }}) => (
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
                                    <Button type="submit" size="icon" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin"/> : <Send/>}</Button>
                                </div>
                            </form>
                        </Form>
                    </div>
                )}
            </DialogContent>
        </Dialog>
        </>
    );
}
