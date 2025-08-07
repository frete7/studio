
'use client';

import { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

import { addVehicle, updateVehicle, deleteVehicle, type Vehicle, type VehicleType, type VehicleCategory } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, PlusCircle, Trash2, Edit } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';


const formSchema = z.object({
  model: z.string().min(2, { message: 'O modelo deve ter pelo menos 2 caracteres.' }),
  licensePlate: z.string().min(7, { message: 'A placa deve ter pelo menos 7 caracteres.' }).max(8, { message: 'A placa deve ter no máximo 8 caracteres.' }),
  typeId: z.string({ required_error: 'Selecione o tipo.' }),
});

type FormData = z.infer<typeof formSchema>;

export default function VehiclesClient() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [vehicleCategories, setVehicleCategories] = useState<VehicleCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const { toast } = useToast();

  const typeMap = new Map(vehicleTypes.map(t => [t.id, t.name]));
  const categoryMap = new Map(vehicleCategories.map(c => [c.id, c.name]));
  const typeToCategoryMap = new Map(vehicleTypes.map(t => [t.id, t.categoryId]));

  useEffect(() => {
    setIsLoading(true);

    const vehiclesQuery = query(collection(db, 'vehicles'));
    const typesQuery = query(collection(db, 'vehicle_types'));
    const categoriesQuery = query(collection(db, 'vehicle_categories'));

    const unsubscribeVehicles = onSnapshot(vehiclesQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Vehicle));
      setVehicles(data);
    });

    const unsubscribeTypes = onSnapshot(typesQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as VehicleType));
      setVehicleTypes(data);
    });

    const unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as VehicleCategory));
      setVehicleCategories(data);
    });

    // Stop loading when all data is fetched, assuming categories is the last one.
    // A more robust solution might use Promise.all with getDocs if realtime is not strictly needed.
    const unsubscribe = () => {
        unsubscribeVehicles();
        unsubscribeTypes();
        unsubscribeCategories();
    }
    
    // This is a simple way to set loading to false. In a real app, you might want to
    // track loading state for each collection.
    const initialLoad = async () => {
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate loading
        setIsLoading(false);
    }
    initialLoad();


    return () => unsubscribe();
  }, []);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      model: '',
      licensePlate: '',
      typeId: undefined,
    },
  });

  const handleEditClick = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    form.reset({
        model: vehicle.model,
        licensePlate: vehicle.licensePlate,
        typeId: vehicle.typeId,
    });
    setIsDialogOpen(true);
  };

  const handleAddNewClick = () => {
    setEditingVehicle(null);
    form.reset({
        model: '',
        licensePlate: '',
        typeId: undefined,
    });
    setIsDialogOpen(true);
  }

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setIsSubmitting(true);

    const categoryId = typeToCategoryMap.get(data.typeId);
    if (!categoryId) {
        toast({
            variant: 'destructive',
            title: 'Erro',
            description: 'O tipo de veículo selecionado não possui uma categoria associada.',
        });
        setIsSubmitting(false);
        return;
    }

    const vehicleData = {
        ...data,
        categoryId,
    };

    try {
      if (editingVehicle) {
        await updateVehicle(editingVehicle.id, vehicleData);
        toast({ title: 'Sucesso!', description: 'Veículo atualizado.' });
      } else {
        await addVehicle(vehicleData);
        toast({ title: 'Sucesso!', description: 'Novo veículo adicionado.' });
      }
      form.reset();
      setIsDialogOpen(false);
      setEditingVehicle(null);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Ocorreu um erro.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
        await deleteVehicle(id);
        toast({ title: 'Sucesso!', description: 'Veículo removido.' });
    } catch (error) {
         toast({
            variant: 'destructive',
            title: 'Erro',
            description: error instanceof Error ? error.message : 'Ocorreu um erro ao remover.',
        });
    }
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (vehicles.length === 0) {
        return <p className="text-center text-muted-foreground py-8">Nenhum veículo cadastrado.</p>;
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Modelo</TableHead>
            <TableHead>Placa</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehicles.map((vehicle) => (
            <TableRow key={vehicle.id}>
              <TableCell className="font-medium">{vehicle.model}</TableCell>
              <TableCell>{vehicle.licensePlate}</TableCell>
              <TableCell>{typeMap.get(vehicle.typeId) || 'N/A'}</TableCell>
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
                            Esta ação não pode ser desfeita. Isso irá remover permanentemente o veículo.
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
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Lista de Veículos</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                 <Button onClick={handleAddNewClick}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Novo
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingVehicle ? 'Editar' : 'Adicionar'} Veículo</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                    <FormField
                        control={form.control}
                        name="model"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Modelo</FormLabel>
                                <FormControl>
                                    <Input placeholder="Modelo do Veículo (Ex: Volvo FH 540)" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="licensePlate"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Placa</FormLabel>
                                <FormControl>
                                    <Input placeholder="Placa (Ex: BRA2E19)" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    
                    <FormField
                        control={form.control}
                        name="typeId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tipo de Veículo</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o Tipo de Veículo..." />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {vehicleTypes.map(type => (
                                            <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
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
