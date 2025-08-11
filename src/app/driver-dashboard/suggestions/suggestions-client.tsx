
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { addSuggestion, addComplaint } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Lightbulb, MessageSquareWarning, Loader2 } from 'lucide-react';

const suggestionSchema = z.object({
  suggestion: z.string().min(10, { message: 'A sugestão deve ter pelo menos 10 caracteres.' }),
});

const complaintSchema = z.object({
  title: z.string().min(5, { message: 'O título deve ter pelo menos 5 caracteres.' }),
  description: z.string().min(20, { message: 'A descrição deve ter pelo menos 20 caracteres.' }),
});

type SuggestionFormData = z.infer<typeof suggestionSchema>;
type ComplaintFormData = z.infer<typeof complaintSchema>;

export default function SuggestionsClient({ userId }: { userId: string }) {
    const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
    const [isComplaintOpen, setIsComplaintOpen] = useState(false);
    const { toast } = useToast();

    const suggestionForm = useForm<SuggestionFormData>({
        resolver: zodResolver(suggestionSchema),
        defaultValues: { suggestion: '' },
    });

    const complaintForm = useForm<ComplaintFormData>({
        resolver: zodResolver(complaintSchema),
        defaultValues: { title: '', description: '' },
    });

    const onSuggestionSubmit = async (data: SuggestionFormData) => {
        try {
            await addSuggestion(userId, data.suggestion);
            toast({ title: "Sugestão enviada!", description: "Obrigado por nos ajudar a melhorar." });
            setIsSuggestionOpen(false);
            suggestionForm.reset();
        } catch (error) {
            toast({ variant: "destructive", title: "Erro", description: "Não foi possível enviar sua sugestão." });
        }
    };

    const onComplaintSubmit = async (data: ComplaintFormData) => {
        try {
            await addComplaint(userId, data.title, data.description);
            toast({ title: "Denúncia enviada!", description: "Analisaremos sua denúncia o mais rápido possível." });
            setIsComplaintOpen(false);
            complaintForm.reset();
        } catch (error) {
            toast({ variant: "destructive", title: "Erro", description: "Não foi possível enviar sua denúncia." });
        }
    };

    return (
        <div className="grid md:grid-cols-2 gap-8">
            {/* Card de Sugestão */}
            <Dialog open={isSuggestionOpen} onOpenChange={setIsSuggestionOpen}>
                <DialogTrigger asChild>
                    <Card className="hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer">
                        <CardHeader className="items-center text-center">
                            <Lightbulb className="h-12 w-12 text-primary mb-4" />
                            <CardTitle>Enviar uma Sugestão</CardTitle>
                            <CardDescription>Tem uma ideia para melhorar nossa plataforma? Queremos ouvir você!</CardDescription>
                        </CardHeader>
                    </Card>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Enviar Sugestão</DialogTitle>
                    </DialogHeader>
                    <Form {...suggestionForm}>
                        <form onSubmit={suggestionForm.handleSubmit(onSuggestionSubmit)} className="space-y-4">
                             <FormField
                                control={suggestionForm.control}
                                name="suggestion"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Sua Sugestão</FormLabel>
                                        <FormControl>
                                            <Textarea rows={6} placeholder="Descreva sua ideia..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
                                <Button type="submit" disabled={suggestionForm.formState.isSubmitting}>
                                    {suggestionForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    Enviar
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Card de Denúncia */}
             <Dialog open={isComplaintOpen} onOpenChange={setIsComplaintOpen}>
                <DialogTrigger asChild>
                    <Card className="hover:shadow-lg hover:border-destructive/50 transition-all cursor-pointer">
                        <CardHeader className="items-center text-center">
                            <MessageSquareWarning className="h-12 w-12 text-destructive mb-4" />
                            <CardTitle>Fazer uma Denúncia</CardTitle>
                            <CardDescription>Encontrou algum problema ou comportamento inadequado? Relate para nós.</CardDescription>
                        </CardHeader>
                    </Card>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Fazer uma Denúncia</DialogTitle>
                    </DialogHeader>
                     <Form {...complaintForm}>
                        <form onSubmit={complaintForm.handleSubmit(onComplaintSubmit)} className="space-y-4">
                             <FormField
                                control={complaintForm.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Título</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ex: Anúncio de frete falso" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={complaintForm.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Descrição da Denúncia</FormLabel>
                                        <FormControl>
                                            <Textarea rows={6} placeholder="Descreva o problema em detalhes..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
                                <Button type="submit" variant="destructive" disabled={complaintForm.formState.isSubmitting}>
                                    {complaintForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    Enviar Denúncia
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
