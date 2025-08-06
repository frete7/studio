
'use client';

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';

import { type VehicleType, addVehicleType, updateVehicleType, deleteVehicleType, type VehicleCategory } from '@/app/actions';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  name: z.string().min(2, { message: 'O nome deve ter pelo menos 2 caracteres.' }),
  categoryId: z.string({ required_error: 'Selecione a categoria.' }),
});

type FormData = z.infer<typeof formSchema>;

interface VehicleTypesClientProps {
    initialVehicleTypes: VehicleType[];
    vehicleCategories: VehicleCategory[];
}

export default function VehicleTypesClient({ initialVehicleTypes, vehicleCategories }: VehicleTypesClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleType | null>(null);

  const { toast } = useToast();
  const router = useRouter();

  const categoryMap = new Map(vehicleCategories.map(c => [c.id, c.name]));

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      categoryId: undefined,
    },
  });

  const handleEditClick = (vehicle: VehicleType) => {
    setEditingVehicle(vehicle);
    form.reset({
        name: vehicle.name,
        categoryId: vehicle.categoryId,
    });
    setIsDialogOpen(true);
  };

  const handleAddNewClick = () => {
    setEditingVehicle(null);
    form.reset({
        name: '',
        categoryId: undefined,
    });
    setIsDialogOpen(true);
  }

  const onSubmit: SubmitHandler<FormData> = async (formData) => {
    setIsLoading(true);
    try {
      if (editingVehicle) {
        await updateVehicleType(editingVehicle.id, formData);
        toast({ title: 'Sucesso!', description: 'Tipo de veículo atualizado.' });
      } else {
        await addVehicleType(formData);
        toast({ title: 'Sucesso!', description: 'Novo tipo de veículo adicionado.' });
      }
      form.reset();
      setIsDialogOpen(false);
      setEditingVehicle(null);
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
        await deleteVehicleType(id);
        toast({ title: 'Sucesso!', description: 'Tipo de veículo removido.' });
        router.refresh();
    } catch (error) {
         toast({
            variant: 'destructive',
            title: 'Erro ao remover',
            description: error instanceof Error ? error.message : 'Ocorreu um erro.',
        });
    }
  }
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Lista de Tipos de Veículos</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                 <Button onClick={handleAddNewClick}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Novo
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingVehicle ? 'Editar' : 'Adicionar'} Tipo de Veículo</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome do Tipo</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Caminhão Truck, Van" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="categoryId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Categoria do Veículo</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione a Categoria..." />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {vehicleCategories.map(cat => (
                                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="secondary">Cancelar</Button>
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
        {initialVehicleTypes.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialVehicleTypes.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell className="font-medium">{vehicle.name}</TableCell>
                  <TableCell>{categoryMap.get(vehicle.categoryId) || 'N/A'}</TableCell>
                  <TableCell className="text-right space-x-2">
                     <Button variant="outline" size="icon" onClick={() => handleEditClick(vehicle)}>
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
                                Esta ação não pode ser desfeita. Isso irá remover permanentemente o tipo de veículo.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(vehicle.id)}>
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
             <p className="text-center text-muted-foreground py-8">Nenhum tipo de veículo cadastrado.</p>
        )}
      </CardContent>
    </Card>
  );
}
