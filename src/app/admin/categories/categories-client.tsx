'use client';

import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

import { addVehicleCategory, updateVehicleCategory, deleteVehicleCategory, type VehicleCategory } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Loader2, PlusCircle, Trash2, Edit } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, { message: 'O nome deve ter pelo menos 2 caracteres.' }),
});

type FormData = z.infer<typeof formSchema>;

export default function CategoriesClient({ initialCategories }: { initialCategories: VehicleCategory[] }) {
  const [categories, setCategories] = useState<VehicleCategory[]>(initialCategories);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<VehicleCategory | null>(null);

  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
    },
  });

  const handleEditClick = (category: VehicleCategory) => {
    setEditingCategory(category);
    form.setValue('name', category.name);
    setIsDialogOpen(true);
  };

  const handleAddNewClick = () => {
    setEditingCategory(null);
    form.reset();
    setIsDialogOpen(true);
  }

  const onSubmit: SubmitHandler<FormData> = async (formData) => {
    setIsSubmitting(true);
    try {
      if (editingCategory) {
        await updateVehicleCategory(editingCategory.id, { name: formData.name });
        toast({ title: 'Sucesso!', description: 'Categoria atualizada.' });
      } else {
        await addVehicleCategory({ name: formData.name });
        toast({ title: 'Sucesso!', description: 'Nova categoria adicionada.' });
      }
      form.reset();
      setIsDialogOpen(false);
      setEditingCategory(null);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error instanceof Error ? error.message : 'Ocorreu um erro. Verifique se você tem permissão.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
        await deleteVehicleCategory(id);
        toast({ title: 'Sucesso!', description: 'Categoria removida.' });
    } catch (error) {
         toast({
            variant: 'destructive',
            title: 'Erro ao remover',
            description: error instanceof Error ? error.message : 'Ocorreu um erro.',
        });
    }
  }

  const renderContent = () => {
    if (categories.length === 0) {
        return <p className="text-center text-muted-foreground py-8">Nenhuma categoria de veículo cadastrada.</p>;
    }

    return (
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="text-right space-x-2">
                     <Button variant="outline" size="icon" onClick={() => handleEditClick(category)}>
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
                                Esta ação não pode ser desfeita. Isso irá remover permanentemente a categoria.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(category.id)}>
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
    );
  }


  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Lista de Categorias de Veículos</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                 <Button onClick={handleAddNewClick}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Nova
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingCategory ? 'Editar' : 'Adicionar'} Categoria</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <Input {...form.register('name')} placeholder="Ex: Pesado, Leve, Utilitário" />
                    {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
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
            </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
}
