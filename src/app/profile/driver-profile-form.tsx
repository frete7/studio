
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, updateDoc, getDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Loader2, Mail, User, Phone, MapPin, Edit, Truck, PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type BodyType, type VehicleType, getVehicleBodyTypes, getVehicleTypes } from '@/app/actions';


const personalInfoSchema = z.object({
  fullName: z.string().min(3, 'Nome completo é obrigatório.'),
  phone: z.string().min(15, 'Telefone inválido.'),
});

const documentsSchema = z.object({
  cnhNumber: z.string().min(5, "Número da CNH inválido."),
  cnhCategory: z.string(),
  rntrc: z.string().optional(),
});

// Componente para o formulário do veículo
const VehicleModal = ({ userId, vehicle, onSave, allVehicleTypes, allBodyTypes }: { userId: string, vehicle?: any, onSave: () => void, allVehicleTypes: any[], allBodyTypes: any[] }) => {
    const vehicleFormSchema = z.object({
        brand: z.string().min(2, "Marca é obrigatória."),
        model: z.string().min(2, "Modelo é obrigatório."),
        year: z.string().length(4, "Ano inválido."),
        licensePlate: z.string().min(7, "Placa inválida."),
        vehicleTypeId: z.string({ required_error: "Selecione o tipo de veículo." }),
        bodyTypeId: z.string({ required_error: "Selecione o tipo de carroceria." }),
    });

    const form = useForm({
        resolver: zodResolver(vehicleFormSchema),
        defaultValues: vehicle || {
            brand: '', model: '', year: '', licensePlate: '', vehicleTypeId: '', bodyTypeId: ''
        }
    });

    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (data: any) => {
        setIsSubmitting(true);
        try {
            const userDocRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userDocRef);
            if (!userDoc.exists()) throw new Error("Usuário não encontrado.");
            
            const existingVehicles = userDoc.data().vehicles || [];
            let updatedVehicles;

            if (vehicle) { // Edit
                updatedVehicles = existingVehicles.map((v: any) => v.licensePlate === vehicle.licensePlate ? { ...v, ...data } : v);
            } else { // Add
                updatedVehicles = [...existingVehicles, data];
            }
            
            await updateDoc(userDocRef, { vehicles: updatedVehicles });
            toast({ title: "Sucesso!", description: `Veículo ${vehicle ? 'atualizado' : 'adicionado'}.` });
            onSave();
        } catch (error) {
             toast({ variant: "destructive", title: "Erro", description: "Não foi possível salvar o veículo." });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="brand" render={({field}) => <FormItem><FormLabel>Marca</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>} />
                    <FormField control={form.control} name="model" render={({field}) => <FormItem><FormLabel>Modelo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>} />
                    <FormField control={form.control} name="year" render={({field}) => <FormItem><FormLabel>Ano</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>} />
                    <FormField control={form.control} name="licensePlate" render={({field}) => <FormItem><FormLabel>Placa</FormLabel><FormControl><Input {...field} readOnly={!!vehicle} /></FormControl><FormMessage/></FormItem>} />
                </div>
                 <FormField control={form.control} name="vehicleTypeId" render={({field}) => <FormItem><FormLabel>Tipo de Veículo</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{allVehicleTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>} />
                 <FormField control={form.control} name="bodyTypeId" render={({field}) => <FormItem><FormLabel>Carroceria</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{allBodyTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>} />
                 <DialogFooter>
                     <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Salvar</Button>
                 </DialogFooter>
            </form>
        </Form>
    )
}

function VehicleManagement({ userId, initialVehicles }: { userId: string, initialVehicles: any[] }) {
    const [vehicles, setVehicles] = useState(initialVehicles);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [allVehicleTypes, setAllVehicleTypes] = useState<VehicleType[]>([]);
    const [allBodyTypes, setAllBodyTypes] = useState<BodyType[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            setIsLoadingData(true);
            try {
                const [vt, bt] = await Promise.all([getVehicleTypes(), getVehicleBodyTypes()]);
                setAllVehicleTypes(vt);
                setAllBodyTypes(bt);
            } catch (error) {
                toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar os tipos de veículos e carrocerias.' });
            } finally {
                setIsLoadingData(false);
            }
        }
        fetchData();
    }, [toast]);
    
    // This effect ensures vehicles stay in sync if the parent component's data changes
     useEffect(() => {
        setVehicles(initialVehicles);
    }, [initialVehicles]);


    const openModal = (vehicle: any = null) => {
        setSelectedVehicle(vehicle);
        setIsModalOpen(true);
    }
    
    const onSave = async () => {
        setIsModalOpen(false);
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
             setVehicles(userDoc.data().vehicles || []);
        }
    }
    
    const handleDelete = async (licensePlate: string) => {
        try {
            const userDocRef = doc(db, 'users', userId);
            const updatedVehicles = vehicles.filter(v => v.licensePlate !== licensePlate);
            await updateDoc(userDocRef, { vehicles: updatedVehicles });
            setVehicles(updatedVehicles);
            toast({ title: 'Sucesso!', description: 'Veículo removido.' });
        } catch(error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível remover o veículo.' });
        }
    }


    if (isLoadingData) {
        return <Loader2 className="animate-spin" />;
    }
    
    return (
        <div className="space-y-4">
             {vehicles.length > 0 ? (
                vehicles.map((v, i) => (
                    <div key={i} className="flex justify-between items-center p-3 border rounded-md">
                        <div>
                            <p className="font-semibold">{v.brand} {v.model} ({v.year})</p>
                            <p className="text-sm text-muted-foreground">{v.licensePlate}</p>
                        </div>
                        <div className="flex items-center gap-1">
                             <Button variant="ghost" size="icon" onClick={() => openModal(v)}><Edit className="h-4 w-4"/></Button>
                             <Button variant="ghost" size="icon" onClick={() => handleDelete(v.licensePlate)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                        </div>
                    </div>
                ))
            ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum veículo cadastrado.</p>
            )}

            <Button variant="outline" className="w-full" onClick={() => openModal()}>
                <PlusCircle className="mr-2 h-4 w-4"/> Adicionar Veículo
            </Button>
            
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{selectedVehicle ? 'Editar' : 'Adicionar'} Veículo</DialogTitle>
                    </DialogHeader>
                    <VehicleModal 
                        userId={userId} 
                        vehicle={selectedVehicle} 
                        onSave={onSave}
                        allVehicleTypes={allVehicleTypes}
                        allBodyTypes={allBodyTypes}
                    />
                </DialogContent>
            </Dialog>
        </div>
    )
}



export default function DriverProfileForm({ profile }: { profile: any }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const [isPersonalInfoOpen, setIsPersonalInfoOpen] = useState(false);
    const [isDocumentsOpen, setIsDocumentsOpen] = useState(false);

    const personalInfoForm = useForm<z.infer<typeof personalInfoSchema>>({
        resolver: zodResolver(personalInfoSchema),
        defaultValues: {
            fullName: profile.fullName || '',
            phone: profile.phone || '',
        },
    });

    const documentsForm = useForm<z.infer<typeof documentsSchema>>({
        resolver: zodResolver(documentsSchema),
        defaultValues: {
            cnhNumber: profile.cnhNumber || '',
            cnhCategory: profile.cnhCategory || '',
            rntrc: profile.rntrc || '',
        },
    });

    const handlePersonalInfoSubmit = async (data: z.infer<typeof personalInfoSchema>) => {
        setIsSubmitting(true);
        try {
            const userDocRef = doc(db, 'users', profile.uid);
            await updateDoc(userDocRef, { 
                fullName: data.fullName,
                phone: data.phone
             });
            toast({ title: 'Sucesso!', description: 'Dados pessoais atualizados.' });
            setIsPersonalInfoOpen(false);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível atualizar os dados.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDocumentsSubmit = async (data: z.infer<typeof documentsSchema>) => {
        setIsSubmitting(true);
        try {
            const userDocRef = doc(db, 'users', profile.uid);
            await updateDoc(userDocRef, {
                cnhNumber: data.cnhNumber,
                cnhCategory: data.cnhCategory,
                rntrc: data.rntrc || '',
            });
            toast({ title: 'Sucesso!', description: 'Documentos atualizados.' });
            setIsDocumentsOpen(false);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível atualizar os documentos.' });
        } finally {
            setIsSubmitting(false);
        }
    };


    const getInitials = (name: string) => {
        if (!name) return '';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    }
    
    const getStatusVariant = (status?: string): "default" | "secondary" | "destructive" | "outline" => {
        switch (status) {
            case 'active': return 'default';
            case 'pending': return 'secondary';
            case 'blocked': return 'destructive';
            case 'suspended': return 'outline';
            case 'incomplete': return 'secondary';
            default: return 'secondary';
        }
    };

    const getStatusLabel = (status?: string): string => {
        switch (status) {
            case 'active': return 'Ativo';
            case 'pending': return 'Pendente';
            case 'blocked': return 'Bloqueado';
            case 'suspended': return 'Suspenso';
            case 'incomplete': return 'Incompleto';
            default: return 'Indefinido';
        }
    }
    
    return (
        <div className="space-y-6">
            <Card>
                 <CardHeader>
                    <div className="flex flex-col md:flex-row items-start gap-6">
                        <Avatar className="h-24 w-24 border-2 border-primary">
                            <AvatarImage src={profile.photoURL ?? ''} alt={profile.name} />
                            <AvatarFallback>{getInitials(profile.fullName)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 pt-2">
                            <div className="flex items-center gap-4">
                                <CardTitle className="text-2xl">{profile.fullName}</CardTitle>
                                <Badge variant={getStatusVariant(profile.status)}>{getStatusLabel(profile.status)}</Badge>
                            </div>
                             <CardDescription>Motorista</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Separator/>
                     {/* Dados Pessoais */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold">Dados Pessoais</h3>
                             <Dialog open={isPersonalInfoOpen} onOpenChange={setIsPersonalInfoOpen}>
                                <DialogTrigger asChild><Button variant="outline" size="sm"><Edit className="mr-2 h-4 w-4" /> Editar</Button></DialogTrigger>
                                <DialogContent>
                                    <DialogHeader><DialogTitle>Editar Dados Pessoais</DialogTitle></DialogHeader>
                                    <Form {...personalInfoForm}>
                                        <form onSubmit={personalInfoForm.handleSubmit(handlePersonalInfoSubmit)} className="space-y-4">
                                            <FormField control={personalInfoForm.control} name="fullName" render={({ field }) => (<FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={personalInfoForm.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Telefone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            <DialogFooter><Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Salvar</Button></DialogFooter>
                                        </form>
                                    </Form>
                                </DialogContent>
                            </Dialog>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 text-sm p-4 border rounded-md">
                            <div className="flex items-center gap-3"><User className="h-4 w-4 text-muted-foreground" /><span><span className="font-semibold">CPF:</span> {profile.cpf}</span></div>
                            <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-muted-foreground" /><span><span className="font-semibold">Telefone:</span> {profile.phone}</span></div>
                            <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /><span><span className="font-semibold">Email:</span> {profile.email}</span></div>
                             <div className="flex items-center gap-3 col-span-full"><MapPin className="h-4 w-4 text-muted-foreground" /><span><span className="font-semibold">Endereço:</span> {profile.address}</span></div>
                        </div>
                    </div>
                    <Separator/>
                     {/* Documentos */}
                    <div className="space-y-4">
                         <div className="flex justify-between items-center">
                             <h3 className="text-lg font-semibold">Documentos e Informações Profissionais</h3>
                            <Dialog open={isDocumentsOpen} onOpenChange={setIsDocumentsOpen}>
                                <DialogTrigger asChild><Button variant="outline" size="sm"><Edit className="mr-2 h-4 w-4" /> Editar</Button></DialogTrigger>
                                <DialogContent>
                                    <DialogHeader><DialogTitle>Editar Documentos</DialogTitle></DialogHeader>
                                     <Form {...documentsForm}>
                                        <form onSubmit={documentsForm.handleSubmit(handleDocumentsSubmit)} className="space-y-4">
                                            <FormField control={documentsForm.control} name="cnhNumber" render={({ field }) => (<FormItem><FormLabel>Número da CNH</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={documentsForm.control} name="cnhCategory" render={({ field }) => (<FormItem><FormLabel>Categoria CNH</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={documentsForm.control} name="rntrc" render={({ field }) => (<FormItem><FormLabel>RNTRC</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            <DialogFooter><Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Salvar</Button></DialogFooter>
                                        </form>
                                    </Form>
                                </DialogContent>
                            </Dialog>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 text-sm p-4 border rounded-md">
                             <p><span className="font-semibold">CNH:</span> {profile.cnhNumber} (Cat. {profile.cnhCategory})</p>
                             <p><span className="font-semibold">Vencimento CNH:</span> {profile.cnhExpiration ? new Date(profile.cnhExpiration.seconds * 1000).toLocaleDateString('pt-BR') : 'N/A'}</p>
                             <p><span className="font-semibold">Possui CNPJ:</span> {profile.hasCnpj ? 'Sim' : 'Não'}</p>
                             {profile.hasCnpj && <p><span className="font-semibold">CNPJ:</span> {profile.cnpj}</p>}
                             <p><span className="font-semibold">Possui ANTT:</span> {profile.hasAntt ? 'Sim' : 'Não'}</p>
                             {profile.hasAntt && <p><span className="font-semibold">RNTRC:</span> {profile.rntrc}</p>}
                             <p><span className="font-semibold">Emite NF:</span> {profile.issuesInvoice ? 'Sim' : 'Não'}</p>
                             <p><span className="font-semibold">Emite CT-e:</span> {profile.issuesCte ? 'Sim' : 'Não'}</p>
                        </div>
                    </div>
                     <Separator/>
                     {/* Veículos */}
                     <div className="space-y-4">
                          <h3 className="text-lg font-semibold">Veículos Cadastrados</h3>
                          <VehicleManagement userId={profile.uid} initialVehicles={profile.vehicles || []} />
                     </div>
                </CardContent>
            </Card>
        </div>
    );
}
