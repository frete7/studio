
'use client';

import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { addCollaborator, updateCollaborator, deleteCollaborator, getCollaborators, type Collaborator } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, PlusCircle, Trash2, Edit } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const formSchema = z.object({
  name: z.string().min(3, { message: 'O nome deve ter pelo menos 3 caracteres.' }),
  internalId: z.string().optional(),
  cpf: z.string().min(14, { message: 'CPF inválido.' }).max(14, { message: 'CPF inválido.' }),
  department: z.string().min(2, { message: 'O setor é obrigatório.' }),
  phone: z.string().min(10, { message: 'Telefone inválido.' }),
  confirmPhone: z.string().min(10, { message: 'Confirmação inválida.' }),
}).refine(data => data.phone === data.confirmPhone, {
    message: "Os telefones não coincidem.",
    path: ["confirmPhone"],
});

type FormData = z.infer<typeof formSchema>;

export default function CollaboratorsClient({ companyId }: { companyId: string }) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCollaborator, setEditingCollaborator] = useState<Collaborator | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadCollaborators = async () => {
      setIsLoading(true);
      try {
        const data = await getCollaborators(companyId);
        setCollaborators(data);
      } catch (error) {
        toast({
            variant: "destructive",
            title: "Erro ao buscar colaboradores",
            description: "Não foi possível carregar a lista de colaboradores."
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadCollaborators();
  }, [companyId, toast]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      internalId: '',
      cpf: '',
      department: '',
      phone: '',
      confirmPhone: ''
    },
  });
  
  const handleMask = (value: string, mask: 'cpf' | 'phone') => {
      let unmasked = value.replace(/\D/g, '');
      if (mask === 'cpf') {
          return unmasked
              .replace(/(\d{3})(\d)/, '$1.$2')
              .replace(/(\d{3})(\d)/, '$1.$2')
              .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
              .substring(0, 14);
      }
      if (mask === 'phone') {
          if (unmasked.length > 10) {
              return unmasked
                  .replace(/(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
                  .substring(0, 15);
          }
          return unmasked
              .replace(/(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
              .substring(0, 14);
      }
      return value;
  };


  const handleEditClick = (collaborator: Collaborator) => {
    setEditingCollaborator(collaborator);
    form.reset({
      name: collaborator.name,
      internalId: collaborator.internalId || '',
      cpf: collaborator.cpf,
      department: collaborator.department,
      phone: collaborator.phone,
      confirmPhone: collaborator.phone,
    });
    setIsDialogOpen(true);
  };

  const handleAddNewClick = () => {
    setEditingCollaborator(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setIsSubmitting(true);
    const { confirmPhone, ...collaboratorData } = data;
    try {
      let updatedList = [...collaborators];
      if (editingCollaborator) {
        await updateCollaborator(companyId, editingCollaborator.id, collaboratorData);
        updatedList = updatedList.map(c => c.id === editingCollaborator.id ? { ...c, ...collaboratorData } : c);
        toast({ title: 'Sucesso!', description: 'Colaborador atualizado.' });
      } else {
        const newCollaborator = await addCollaborator(companyId, collaboratorData);
        updatedList.push(newCollaborator);
        toast({ title: 'Sucesso!', description: 'Novo colaborador adicionado.' });
      }
      setCollaborators(updatedList);
      form.reset();
      setIsDialogOpen(false);
      setEditingCollaborator(null);
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
      await deleteCollaborator(companyId, id);
      setCollaborators(collaborators.filter(c => c.id !== id));
      toast({ title: 'Sucesso!', description: 'Colaborador removido.' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover',
        description: error instanceof Error ? error.message : 'Ocorreu um erro.',
      });
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (collaborators.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-8">
            <p>Nenhum colaborador cadastrado ainda.</p>
            <Button onClick={handleAddNewClick} className="mt-4">
                 <PlusCircle className="mr-2 h-4 w-4" />
                 Adicionar Primeiro Colaborador
            </Button>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead className="hidden sm:table-cell">Setor</TableHead>
            <TableHead className="hidden md:table-cell">CPF</TableHead>
            <TableHead className="hidden md:table-cell">Telefone</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {collaborators.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.name}</TableCell>
              <TableCell className="hidden sm:table-cell">{c.department}</TableCell>
              <TableCell className="hidden md:table-cell">{c.cpf}</TableCell>
              <TableCell className="hidden md:table-cell">{c.phone}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button variant="outline" size="icon" onClick={() => handleEditClick(c)}>
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
                        Esta ação não pode ser desfeita. Isso irá remover permanentemente o colaborador.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(c.id)}>Sim, remover</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Lista de Colaboradores</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddNewClick} disabled={collaborators.length === 0}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Novo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingCollaborator ? 'Editar' : 'Adicionar'} Colaborador</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl><Input placeholder="Nome do colaborador" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <div className="grid md:grid-cols-2 gap-4">
                     <FormField
                        control={form.control}
                        name="cpf"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>CPF</FormLabel>
                                <FormControl><Input 
                                    placeholder="000.000.000-00" 
                                    {...field}
                                    onChange={(e) => field.onChange(handleMask(e.target.value, 'cpf'))}
                                /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="department"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Setor Responsável</FormLabel>
                                <FormControl><Input placeholder="Ex: Logística, Financeiro" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                 <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Telefone (com DDD)</FormLabel>
                                <FormControl><Input 
                                    placeholder="(00) 00000-0000" 
                                    {...field}
                                    onChange={(e) => field.onChange(handleMask(e.target.value, 'phone'))} 
                                /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="confirmPhone"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Confirmar Telefone</FormLabel>
                                <FormControl><Input 
                                    placeholder="Confirme o telefone" 
                                    {...field}
                                    onChange={(e) => field.onChange(handleMask(e.target.value, 'phone'))}
                                /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <FormField
                  control={form.control}
                  name="internalId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID Interno (Opcional)</FormLabel>
                      <FormControl><Input placeholder="ID ou código interno" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancelar</Button>
                  </DialogClose>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
}
