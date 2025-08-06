
'use client';

import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { groupBy } from 'lodash';

import { type BodyType } from '@/app/actions';
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
import { Loader2, PlusCircle, Trash2, Edit, Database } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, { message: 'O nome deve ter pelo menos 2 caracteres.' }),
  group: z.string().min(2, { message: 'O grupo deve ter pelo menos 2 caracteres.' }),
});

type FormData = z.infer<typeof formSchema>;

export default function BodyTypesClient() {
  const [bodyTypes, setBodyTypes] = useState<BodyType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBodyType, setEditingBodyType] = useState<BodyType | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    const q = query(collection(db, 'body_types'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const data: BodyType[] = [];
        querySnapshot.forEach((doc) => {
            data.push({ ...doc.data(), id: doc.id } as BodyType);
        });
        setBodyTypes(data);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching body types: ", error);
        toast({
            variant: "destructive",
            title: "Erro ao buscar dados",
            description: "Verifique suas permissões ou tente novamente mais tarde."
        });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      group: '',
    },
  });

  const handleEditClick = (bodyType: BodyType) => {
    setEditingBodyType(bodyType);
    form.reset({
        name: bodyType.name,
        group: bodyType.group,
    });
    setIsDialogOpen(true);
  };

  const handleAddNewClick = () => {
    setEditingBodyType(null);
    form.reset();
    setIsDialogOpen(true);
  }

  const handleSeedData = async () => {
      setIsSeeding(true);
      try {
        const bodyTypesToSeed = [
            { name: 'Graneleiro', group: 'Abertas' },
            { name: 'Grade Baixa', group: 'Abertas' },
            { name: 'Prancha', group: 'Abertas' },
            { name: 'Caçamba', group: 'Abertas' },
            { name: 'Plataforma', group: 'Abertas' },
            { name: 'Sider', group: 'Fechadas' },
            { name: 'Baú', group: 'Fechadas' },
            { name: 'Baú Frigorífico', group: 'Fechadas' },
            { name: 'Baú Refrigerado', group: 'Fechadas' },
            { name: 'Silo', group: 'Especiais' },
            { name: 'Cegonheiro', group: 'Especiais' },
            { name: 'Gaiola', group: 'Especiais' },
            { name: 'Tanque', group: 'Especiais' },
            { name: 'Bug Porta Container', group: 'Especiais' },
            { name: 'Munk', group: 'Especiais' },
            { name: 'Apenas Cavalo', group: 'Especiais' },
            { name: 'Cavaqueira', group: 'Especiais' },
            { name: 'Hopper', group: 'Especiais' },
        ];

        const bodyTypesCollection = collection(db, 'body_types');
        const snapshot = await getDocs(bodyTypesCollection);

        if (snapshot.empty) {
            const batch = writeBatch(db);
            bodyTypesToSeed.forEach((bodyType) => {
                const docRef = doc(collection(db, 'body_types'));
                batch.set(docRef, bodyType);
            });
            await batch.commit();
            toast({ title: 'Sucesso!', description: 'Dados iniciais cadastrados.' });
        } else {
            toast({
                variant: 'destructive',
                title: 'Atenção',
                description: 'Os dados iniciais já foram cadastrados anteriormente.',
            });
        }
      } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Erro ao cadastrar dados',
            description: error instanceof Error ? error.message : 'Ocorreu um erro.',
        });
      } finally {
        setIsSeeding(false);
      }
  }

  const onSubmit: SubmitHandler<FormData> = async (formData) => {
    setIsSubmitting(true);
    try {
      if (editingBodyType) {
        const bodyTypeDoc = doc(db, 'body_types', editingBodyType.id);
        await updateDoc(bodyTypeDoc, formData);
        toast({ title: 'Sucesso!', description: 'Tipo de carroceria atualizado.' });
      } else {
        await addDoc(collection(db, 'body_types'), formData);
        toast({ title: 'Sucesso!', description: 'Novo tipo de carroceria adicionado.' });
      }
      form.reset();
      setIsDialogOpen(false);
      setEditingBodyType(null);
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
        await deleteDoc(doc(db, 'body_types', id));
        toast({ title: 'Sucesso!', description: 'Tipo de carroceria removido.' });
    } catch (error) {
         toast({
            variant: 'destructive',
            title: 'Erro ao remover',
            description: error instanceof Error ? error.message : 'Ocorreu um erro.',
        });
    }
  }
  
  const groupedBodyTypes = groupBy(bodyTypes, 'group');

  const renderContent = () => {
    if (isLoading) {
       return (
          <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
       )
    }

    if (bodyTypes.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-8 space-y-4">
                <p>Nenhum tipo de carroceria cadastrado.</p>
                <Button onClick={handleSeedData} disabled={isSeeding}>
                    {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                    Cadastrar Dados Iniciais
                </Button>
            </div>
        );
    }

    return (
      <div className="space-y-6">
        {Object.entries(groupedBodyTypes).map(([group, types]) => (
          <div key={group}>
            <h3 className="text-lg font-semibold mb-2 text-primary">{group}</h3>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {types.map((bodyType) => (
                    <TableRow key={bodyType.id}>
                    <TableCell className="font-medium">{bodyType.name}</TableCell>
                    <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="icon" onClick={() => handleEditClick(bodyType)}>
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
                                    Esta ação não pode ser desfeita. Isso irá remover permanentemente o tipo de carroceria.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(bodyType.id)}>
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
        ))}
      </div>
    );
  }


  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Lista de Tipos de Carrocerias</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                 <Button onClick={handleAddNewClick}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Nova
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingBodyType ? 'Editar' : 'Adicionar'} Tipo de Carroceria</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                    <Input {...form.register('name')} placeholder="Ex: Baú, Sider" />
                    {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
                    
                    <Input {...form.register('group')} placeholder="Grupo (Ex: Abertas, Fechadas)" />
                    {form.formState.errors.group && <p className="text-sm text-destructive">{form.formState.errors.group.message}</p>}

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
