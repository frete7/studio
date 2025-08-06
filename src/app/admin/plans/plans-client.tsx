
'use client';

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';

import { addPlan, updatePlan, deletePlan, type Plan } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, PlusCircle, Trash2, Edit } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const formSchema = z.object({
  name: z.string().min(2, { message: 'O nome deve ter pelo menos 2 caracteres.' }),
  description: z.string().min(10, { message: 'A descrição deve ter pelo menos 10 caracteres.' }),
  durationDays: z.coerce.number().int().positive({ message: 'A duração deve ser um número positivo.' }),
  pricePix: z.coerce.number().positive({ message: 'O preço para PIX deve ser positivo.' }),
  priceCard: z.coerce.number().positive({ message: 'O preço para Cartão deve ser positivo.' }),
});

type FormData = z.infer<typeof formSchema>;

interface PlansClientProps {
  initialPlans: Plan[];
}

export default function PlansClient({ initialPlans }: PlansClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      durationDays: 30,
      pricePix: 0,
      priceCard: 0,
    },
  });

  const handleEditClick = (plan: Plan) => {
    setEditingPlan(plan);
    form.reset({
        name: plan.name,
        description: plan.description,
        durationDays: plan.durationDays,
        pricePix: plan.pricePix,
        priceCard: plan.priceCard,
    });
    setIsDialogOpen(true);
  };

  const handleAddNewClick = () => {
    setEditingPlan(null);
    form.reset({
      name: '',
      description: '',
      durationDays: 30,
      pricePix: 0,
      priceCard: 0,
    });
    setIsDialogOpen(true);
  }

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setIsLoading(true);
    try {
      if (editingPlan) {
        await updatePlan(editingPlan.id, data);
        toast({ title: 'Sucesso!', description: 'Plano atualizado.' });
      } else {
        await addPlan(data);
        toast({ title: 'Sucesso!', description: 'Novo plano adicionado.' });
      }
      form.reset();
      setIsDialogOpen(false);
      setEditingPlan(null);
      router.refresh();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error instanceof Error ? error.message : 'Ocorreu um erro.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
        await deletePlan(id);
        toast({ title: 'Sucesso!', description: 'Plano removido.' });
        router.refresh();
    } catch (error) {
         toast({
            variant: 'destructive',
            title: 'Erro ao remover',
            description: error instanceof Error ? error.message : 'Ocorreu um erro.',
        });
    }
  }

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Lista de Planos</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                 <Button onClick={handleAddNewClick}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Novo Plano
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>{editingPlan ? 'Editar' : 'Adicionar'} Plano</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nome do Plano</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ex: Plano Mensal" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Descrição</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Descreva os benefícios do plano..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="grid grid-cols-3 gap-4">
                        <FormField
                            control={form.control}
                            name="durationDays"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Duração (dias)</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="30" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="pricePix"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Valor (PIX)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" placeholder="49.90" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="priceCard"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Valor (Cartão)</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" placeholder="59.90" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar
                        </Button>
                    </DialogFooter>
                </form>
                </Form>
            </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {initialPlans.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Valor PIX</TableHead>
                <TableHead>Valor Cartão</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialPlans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell>{plan.durationDays} dias</TableCell>
                  <TableCell>{formatCurrency(plan.pricePix)}</TableCell>
                  <TableCell>{formatCurrency(plan.priceCard)}</TableCell>
                  <TableCell className="text-right space-x-2">
                     <Button variant="outline" size="icon" onClick={() => handleEditClick(plan)}>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Editar</span>
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                             <Button variant="destructive" size="icon">
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Remover</span>
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta ação não pode ser desfeita. Isso irá remover permanentemente o plano.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(plan.id)}>
                                Sim, remover
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-center text-muted-foreground py-8">Nenhum plano cadastrado.</p>
        )}
      </CardContent>
    </Card>
  );
}
