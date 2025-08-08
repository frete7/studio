
'use client';

import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { type Plan, addPlan, updatePlan, deletePlan } from '@/app/actions';

import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, PlusCircle, Trash2, Edit, X, Package, Users, BarChart3, Star, CheckCircle } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';


const formSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
  description: z.string().min(10, "A descrição deve ter pelo menos 10 caracteres."),
  durationDays: z.coerce.number().int().positive("A duração deve ser um número positivo."),
  pricePix: z.coerce.number().positive("O preço para PIX deve ser positivo."),
  priceCard: z.coerce.number().positive("O preço para Cartão deve ser positivo."),
  userType: z.enum(['driver', 'company'], { required_error: 'Selecione o tipo de usuário.' }),

  // Permissões de Frete
  freightLimitType: z.enum(['limited', 'unlimited'], { required_error: 'Defina o limite de fretes.' }),
  freightLimit: z.coerce.number().optional(),
  allowedFreightTypes: z.object({
    agregamento: z.boolean().default(false),
    completo: z.boolean().default(false),
    retorno: z.boolean().default(false),
  }).refine(data => data.agregamento || data.completo || data.retorno, {
    message: "Selecione pelo menos um tipo de frete."
  }),

  // Permissões de Colaboradores
  collaboratorLimitType: z.enum(['limited', 'unlimited'], { required_error: 'Defina o limite de colaboradores.' }),
  collaboratorLimit: z.coerce.number().optional(),

  // Permissões de Funcionalidades
  hasStatisticsAccess: z.boolean().default(false),
  hasReturningDriversAccess: z.boolean().default(false),

}).refine(data => data.freightLimitType !== 'limited' || (data.freightLimit !== undefined && data.freightLimit > 0), {
    message: 'A quantidade de fretes deve ser maior que 0.',
    path: ['freightLimit'],
}).refine(data => data.collaboratorLimitType !== 'limited' || (data.collaboratorLimit !== undefined && data.collaboratorLimit >= 0), {
    message: 'A quantidade de colaboradores deve ser 0 ou maior.',
    path: ['collaboratorLimit'],
});

type FormData = z.infer<typeof formSchema>;

export default function PlansClient({ initialData }: { initialData: Plan[] }) {
  const [plans, setPlans] = useState<Plan[]>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      durationDays: 30,
      pricePix: 0,
      priceCard: 0,
      userType: 'driver',
      freightLimitType: 'unlimited',
      freightLimit: 0,
      allowedFreightTypes: { agregamento: true, completo: true, retorno: true },
      collaboratorLimitType: 'unlimited',
      collaboratorLimit: 0,
      hasStatisticsAccess: true,
      hasReturningDriversAccess: false,
    },
  });

  const freightLimitType = useWatch({ control: form.control, name: 'freightLimitType' });
  const collaboratorLimitType = useWatch({ control: form.control, name: 'collaboratorLimitType' });

  const handleEditClick = (plan: Plan) => {
    setEditingPlan(plan);
    form.reset({
        ...plan,
        freightLimit: plan.freightLimit || 0,
        collaboratorLimit: plan.collaboratorLimit || 0,
    });
    setIsDialogOpen(true);
  };

  const handleAddNewClick = () => {
    setEditingPlan(null);
    form.reset();
    setIsDialogOpen(true);
  }

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setIsSubmitting(true);
    const dataToSave = {
      ...data,
      freightLimit: data.freightLimitType === 'unlimited' ? -1 : data.freightLimit,
      collaboratorLimit: data.collaboratorLimitType === 'unlimited' ? -1 : data.collaboratorLimit,
    };

    try {
      if (editingPlan) {
        await updatePlan(editingPlan.id, dataToSave);
        toast({ title: 'Sucesso!', description: 'Plano atualizado.' });
      } else {
        await addPlan(dataToSave as Omit<Plan, 'id'>);
        toast({ title: 'Sucesso!', description: 'Novo plano adicionado.' });
      }
      form.reset();
      setIsDialogOpen(false);
      setEditingPlan(null);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error instanceof Error ? error.message : 'Ocorreu um erro.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
        await deletePlan(id);
        toast({ title: 'Sucesso!', description: 'Plano removido.' });
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

  const renderContent = () => {
    if (plans.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-8">
            <p>Nenhum plano cadastrado.</p>
            <Button onClick={handleAddNewClick} className="mt-4">
                <PlusCircle className="mr-2 h-4 w-4"/>
                Criar Primeiro Plano
            </Button>
        </div>
      );
    }
    
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Fretes</TableHead>
              <TableHead>Colaboradores</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell className="font-medium">{plan.name}</TableCell>
                <TableCell>{plan.freightLimitType === 'unlimited' ? 'Ilimitados' : `${plan.freightLimit} / mês`}</TableCell>
                <TableCell>{plan.collaboratorLimitType === 'unlimited' ? 'Ilimitados' : plan.collaboratorLimit}</TableCell>
                <TableCell>{formatCurrency(plan.pricePix)}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="icon" onClick={() => handleEditClick(plan)}>
                      <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                      <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="icon">
                              <Trash2 className="h-4 w-4" />
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
      </div>
    );
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
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{editingPlan ? 'Editar' : 'Adicionar'} Plano</DialogTitle>
                     <DialogDescription>
                        Configure os detalhes, preços e permissões para este plano.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4 max-h-[70vh] overflow-y-auto pr-6">
                    {/* Dados Básicos */}
                    <h3 className="text-lg font-semibold">Dados Básicos</h3>
                    <FormField name="name" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Nome do Plano</FormLabel><FormControl><Input placeholder="Ex: Plano Empresa" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField name="description" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea placeholder="Descreva os benefícios do plano..." {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField name="userType" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Tipo de Usuário</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4"><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="driver" /></FormControl><FormLabel className="font-normal">Motorista</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="company" /></FormControl><FormLabel className="font-normal">Empresa</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-3 gap-4">
                        <FormField name="durationDays" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Duração (dias)</FormLabel><FormControl><Input type="number" placeholder="30" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField name="pricePix" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Valor (PIX)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="49.90" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField name="priceCard" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>Valor (Cartão)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="59.90" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>

                    <Separator />
                    
                    {/* Cadastro de Fretes */}
                    <h3 className="text-lg font-semibold">Cadastro de Fretes</h3>
                    <FormField name="freightLimitType" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Quantidade de Pedidos</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4"><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="unlimited" /></FormControl><FormLabel className="font-normal">Ilimitado</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="limited" /></FormControl><FormLabel className="font-normal">Limitado</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>
                    )} />
                    {freightLimitType === 'limited' && (
                        <FormField name="freightLimit" control={form.control} render={({ field }) => (
                             <FormItem><FormLabel>Quantidade Máxima / mês</FormLabel><FormControl><Input type="number" placeholder="100" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    )}
                    <FormField
                        name="allowedFreightTypes"
                        control={form.control}
                        render={() => (
                        <FormItem>
                            <FormLabel>Tipos de Fretes Permitidos</FormLabel>
                            <div className="grid grid-cols-3 gap-4">
                               <FormField control={form.control} name="allowedFreightTypes.agregamento" render={({field}) => (<FormItem className="flex items-center gap-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>Agregamento</FormLabel></FormItem>)} />
                               <FormField control={form.control} name="allowedFreightTypes.completo" render={({field}) => (<FormItem className="flex items-center gap-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>Completo</FormLabel></FormItem>)} />
                               <FormField control={form.control} name="allowedFreightTypes.retorno" render={({field}) => (<FormItem className="flex items-center gap-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>Retorno</FormLabel></FormItem>)} />
                            </div>
                            <FormMessage />
                        </FormItem>
                        )}
                    />

                    <Separator />

                    {/* Cadastro de Colaboradores */}
                    <h3 className="text-lg font-semibold">Cadastro de Colaboradores</h3>
                     <FormField name="collaboratorLimitType" control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Quantidade de Colaboradores</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4"><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="unlimited" /></FormControl><FormLabel className="font-normal">Ilimitado</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="limited" /></FormControl><FormLabel className="font-normal">Limitado</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem>
                    )} />
                    {collaboratorLimitType === 'limited' && (
                        <FormField name="collaboratorLimit" control={form.control} render={({ field }) => (
                             <FormItem><FormLabel>Quantidade Máxima</FormLabel><FormControl><Input type="number" placeholder="5" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    )}

                    <Separator />

                    {/* Acesso a Funcionalidades */}
                     <h3 className="text-lg font-semibold">Acesso a Funcionalidades</h3>
                     <div className="space-y-3">
                         <FormField control={form.control} name="hasStatisticsAccess" render={({field}) => (
                            <FormItem className="flex items-center justify-between rounded-lg border p-3"><FormLabel>Acesso a Estatísticas</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl></FormItem>
                         )} />
                         <FormField control={form.control} name="hasReturningDriversAccess" render={({field}) => (
                             <FormItem className="flex items-center justify-between rounded-lg border p-3"><FormLabel>Acesso a Motoristas Retornando</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange}/></FormControl></FormItem>
                         )} />
                     </div>
                </form>
                </Form>
                 <DialogFooter className="pt-6 border-t mt-6">
                        <DialogClose asChild>
                            <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        </DialogClose>
                        <Button type="button" onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar
                        </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
}
