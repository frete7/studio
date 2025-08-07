
'use client';

import { collection, doc, getDoc, getCountFromServer, query, updateDoc, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { notFound, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Mail, Phone, Calendar, User, ShieldCheck, Truck, FileText, ArrowLeft, Loader2, MoreVertical, Building, Landmark, CaseSensitive, Package, PackageSearch, PackageCheck, CreditCard, Pencil, ExternalLink, ThumbsUp, ThumbsDown, CircleHelp } from 'lucide-react';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, FormProvider } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from "@/components/ui/dropdown-menu"
import { updateUserStatus, assignPlanToUser, getPlans, type Plan, updateDocumentStatus, updateUserByAdmin } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';


type DocumentData = {
    url: string;
    status: 'pending' | 'approved' | 'rejected';
}

type UserProfile = {
    uid: string;
    name: string;
    email: string;
    role: 'driver' | 'company' | 'admin';
    status?: 'active' | 'pending' | 'blocked' | 'suspended' | 'incomplete';
    createdAt: any;
    photoURL?: string;
    // Driver fields
    birthDate?: string;
    cnh?: string;
    cnhCategory?: string;
    // Company fields
    cnpj?: string;
    foundationDate?: string;
    tradingName?: string;
    address?: string;
    activePlanId?: string;
    activePlanName?: string;
    responsible?: {
        name: string;
        cpf: string;
        document?: DocumentData | string; // Can be old format
    };
    cnpjCard?: DocumentData | string; // Can be old format
};

const editFormSchema = z.object({
    name: z.string().min(3, "Razão Social é obrigatória."),
    tradingName: z.string().min(3, "Nome Fantasia é obrigatório."),
    cnpj: z.string().optional(),
    address: z.string().optional(),
    responsibleName: z.string().min(3, "Nome do responsável é obrigatório."),
    responsibleCpf: z.string().min(11, "CPF do responsável é obrigatório.")
});

type EditFormData = z.infer<typeof editFormSchema>;


type CompanyStats = {
    activeFreights: number;
    requestedFreights: number;
    completedFreights: number;
};


const getInitials = (name: string) => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

const calculateAge = (birthDate: string) => {
    if (!birthDate) return '';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return `(${age} anos)`;
};

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

const getDocStatusLabel = (status?: string) => {
    switch(status) {
        case 'approved': return 'Aprovado';
        case 'rejected': return 'Recusado';
        case 'pending':
        default: return 'Pendente';
    }
};

const getDocStatusIcon = (status?: string) => {
    switch(status) {
        case 'approved': return <ThumbsUp className="h-4 w-4 text-green-500" />;
        case 'rejected': return <ThumbsDown className="h-4 w-4 text-destructive" />;
        case 'pending':
        default: return <CircleHelp className="h-4 w-4 text-yellow-500" />;
    }
};

const userStatuses: (UserProfile['status'])[] = ['active', 'pending', 'blocked', 'suspended'];


export default function UserDetailsClient({ userId }: { userId: string }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [companyStats, setCompanyStats] = useState<CompanyStats | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [isSubmittingPlan, setIsSubmittingPlan] = useState(false);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [isSubmittingEditUser, setIsSubmittingEditUser] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const form = useForm<EditFormData>({
    resolver: zodResolver(editFormSchema)
  });


  useEffect(() => {
    if (!userId) {
        setIsLoading(false);
        return;
    };
    
    const fetchCompanyStats = async (companyId: string) => {
        try {
            const freightsCollection = collection(db, 'freights');
            
            const activeQuery = query(freightsCollection, where('companyId', '==', companyId), where('status', '==', 'active'));
            const activeSnapshot = await getCountFromServer(activeQuery);
            
            const requestedQuery = query(freightsCollection, where('companyId', '==', companyId), where('status', '==', 'requested'));
            const requestedSnapshot = await getCountFromServer(requestedQuery);
            
            const completedQuery = query(freightsCollection, where('companyId', '==', companyId), where('status', '==', 'completed'));
            const completedSnapshot = await getCountFromServer(completedQuery);

            setCompanyStats({
                activeFreights: activeSnapshot.data().count,
                requestedFreights: requestedSnapshot.data().count,
                completedFreights: completedSnapshot.data().count,
            });
        } catch (error) {
            console.error("Error fetching company freight stats:", error);
            toast({
                variant: 'destructive',
                title: 'Erro ao buscar dados',
                description: 'Não foi possível carregar as estatísticas de fretes da empresa.'
            })
        }
    }

    const fetchPlansData = async (userRole: string) => {
        try {
            const allPlans = await getPlans();
            const filteredPlans = allPlans.filter(plan => plan.userType === userRole);
            setPlans(filteredPlans);
        } catch (error) {
             console.error("Error fetching plans:", error);
        }
    }

    const userDocRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
            const userData = { ...doc.data(), uid: doc.id } as UserProfile;
            setUser(userData);
            setSelectedPlanId(userData.activePlanId || 'none');
            form.reset({
                name: userData.name,
                tradingName: userData.tradingName,
                cnpj: userData.cnpj,
                address: userData.address,
                responsibleName: userData.responsible?.name || '',
                responsibleCpf: userData.responsible?.cpf || '',
            });
            if (userData.role === 'company') {
                fetchCompanyStats(userData.uid);
            }
            fetchPlansData(userData.role);
        } else {
            notFound();
        }
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching user details:", error);
        setIsLoading(false);
    });
      
    return () => unsubscribe();
  }, [userId, toast, form]);
  
  const handleStatusChange = async (newStatus: UserProfile['status']) => {
    if (!user || !newStatus) return;

    try {
        await updateUserStatus(user.uid, newStatus);
        // The onSnapshot listener will update the UI automatically
        toast({
            title: "Sucesso!",
            description: `Status do usuário atualizado para ${getStatusLabel(newStatus)}.`,
        });
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Erro ao atualizar",
            description: error instanceof Error ? `Falha ao atualizar: ${error.code || error.message}` : 'Ocorreu um erro desconhecido.',
        });
        console.error("Failed to update user status:", error);
    }
  };
  
  const handleAssignPlan = async () => {
      if (!user) return;
      
      setIsSubmittingPlan(true);
      try {
          const planIdToAssign = selectedPlanId === 'none' ? '' : selectedPlanId;
          const selectedPlan = plans.find(p => p.id === planIdToAssign);
          const planName = selectedPlan ? selectedPlan.name : 'Básico';

          await assignPlanToUser(user.uid, planIdToAssign, planName);
          toast({ title: 'Sucesso!', description: 'Plano atribuído ao usuário.' });
          setIsPlanDialogOpen(false);
      } catch (error) {
          toast({
              variant: 'destructive',
              title: 'Erro ao atribuir plano',
              description: error instanceof Error ? `Falha ao atribuir plano: ${error.code || error.message}` : 'Ocorreu um erro desconhecido.',
          });
      } finally {
          setIsSubmittingPlan(false);
      }
  }

  const handleDocumentStatusChange = async (docField: 'responsible.document' | 'cnpjCard', newStatus: 'approved' | 'rejected') => {
      if (!user) return;
      try {
          await updateDocumentStatus(user.uid, docField, newStatus);
          toast({
              title: "Sucesso!",
              description: `Documento ${docField === 'cnpjCard' ? 'CNPJ' : 'do Responsável'} foi ${newStatus === 'approved' ? 'aprovado' : 'recusado'}.`,
          });
      } catch (error) {
           toast({
              variant: 'destructive',
              title: 'Erro ao atualizar documento',
              description: error instanceof Error ? `Falha ao atualizar o status do documento: ${error.code || error.message}` : 'Ocorreu um erro desconhecido.',
          });
      }
  }

  const handleUpdateUser = async (data: EditFormData) => {
    if(!user) return;
    setIsSubmittingEditUser(true);
    try {
        await updateUserByAdmin(user.uid, data);
        toast({ title: "Sucesso!", description: "Dados do usuário atualizados."});
        setIsEditUserDialogOpen(false);
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Erro ao atualizar usuário',
            description: error instanceof Error ? `Falha ao atualizar os dados do usuário: ${error.code || error.message}` : 'Ocorreu um erro desconhecido.',
        });
    } finally {
        setIsSubmittingEditUser(false);
    }
  }

  if (isLoading || !user) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const isCompany = user.role === 'company';
  
  const getDocumentProps = (docData: DocumentData | string | undefined) => {
      if (typeof docData === 'string') {
          return { url: docData, status: 'pending' };
      }
      return { url: docData?.url, status: docData?.status || 'pending' };
  }
  
  const responsibleDocumentProps = getDocumentProps(user.responsible?.document);
  const cnpjCardProps = getDocumentProps(user.cnpjCard);


  return (
    <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <Button asChild variant="outline" size="icon">
                    <Link href="/admin/users">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <h1 className="text-2xl font-bold">Detalhes do Usuário</h1>
            </div>
            <div className='flex items-center gap-2'>
                <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline"><Pencil className="mr-2 h-4 w-4" /> Editar Perfil</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Editar Dados do Usuário</DialogTitle>
                        </DialogHeader>
                        <FormProvider {...form}>
                            <form onSubmit={form.handleSubmit(handleUpdateUser)} className="space-y-4">
                               <FormField
                                    control={form.control}
                                    name="tradingName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nome Fantasia</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Razão Social</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="cnpj"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>CNPJ</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="responsibleName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nome do Responsável</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={form.control}
                                    name="responsibleCpf"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>CPF do Responsável</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={form.control}
                                    name="address"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Endereço</FormLabel>
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <DialogFooter>
                                    <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
                                    <Button type="submit" disabled={isSubmittingEditUser}>
                                        {isSubmittingEditUser && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                        Salvar
                                    </Button>
                                </DialogFooter>
                            </form>
                        </FormProvider>
                    </DialogContent>
                </Dialog>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Moderar
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Alterar Status Geral</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {userStatuses.map(status => (
                            <DropdownMenuItem
                                key={status}
                                disabled={user.status === status}
                                onSelect={() => handleStatusChange(status)}
                            >
                                Mudar para {getStatusLabel(status)}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>

        <Card>
            <CardHeader>
                <div className="flex items-start gap-6">
                    <Avatar className="h-24 w-24 border-2 border-primary">
                        <AvatarImage src={user.photoURL ?? `https://avatar.vercel.sh/${user.email}.png`} alt={user.name} />
                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-4">
                            <CardTitle className="text-3xl">{isCompany ? user.tradingName || user.name : user.name}</CardTitle>
                            <Badge variant={getStatusVariant(user.status)} className="text-sm">
                                {getStatusLabel(user.status)}
                            </Badge>
                        </div>
                         <p className="text-muted-foreground capitalize">{isCompany ? 'Empresa' : 'Motorista'}</p>
                        {isCompany && <p className="text-sm text-muted-foreground">{user.name}</p>}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <Separator />
                {isCompany ? (
                    <>
                    <h3 className="text-lg font-semibold">Dados da Empresa</h3>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="flex items-center gap-3">
                            <CaseSensitive className="h-5 w-5 text-muted-foreground" />
                            <span><span className="font-semibold">Nome Fantasia:</span> {user.tradingName || 'Não informado'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Landmark className="h-5 w-5 text-muted-foreground" />
                            <span><span className="font-semibold">Razão Social:</span> {user.name}</span>
                        </div>
                         <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <span><span className="font-semibold">CNPJ:</span> {user.cnpj ?? 'Não informado'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Mail className="h-5 w-5 text-muted-foreground" />
                            <span><span className="font-semibold">Email:</span> {user.email}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                            <span><span className="font-semibold">Data de Fundação:</span> {user.foundationDate ? new Date(user.foundationDate).toLocaleDateString('pt-BR') : 'Não informado'}</span>
                        </div>
                         <div className="flex items-center gap-3 col-span-full">
                            <Building className="h-5 w-5 text-muted-foreground" />
                            <span><span className="font-semibold">Endereço:</span> {user.address ?? 'Não informado'}</span>
                        </div>
                    </div>
                    </>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="flex items-center gap-3">
                            <User className="h-5 w-5 text-muted-foreground" />
                            <span><span className="font-semibold">Nome:</span> {user.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Mail className="h-5 w-5 text-muted-foreground" />
                            <span><span className="font-semibold">Email:</span> {user.email}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                            <span><span className="font-semibold">Data de Nasc.:</span> {user.birthDate ? `${new Date(user.birthDate).toLocaleDateString('pt-BR')} ${calculateAge(user.birthDate)}` : 'Não informado'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                            <span><span className="font-semibold">CNH:</span> {user.cnh ?? 'Não informado'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                            <span><span className="font-semibold">Categoria CNH:</span> {user.cnhCategory ?? 'Não informado'}</span>
                        </div>
                    </div>
                )}
                 <Separator />
                 <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        Dados do Responsável
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="flex items-center gap-3">
                            <User className="h-5 w-5 text-muted-foreground" />
                            <span><span className="font-semibold">Nome:</span> {user.responsible?.name || 'Não informado'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <span><span className="font-semibold">CPF:</span> {user.responsible?.cpf || 'Não informado'}</span>
                        </div>
                    </div>
                 </div>

                <Separator />
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                           Plano e Assinatura
                        </h3>
                         <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline">
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Gerenciar Plano
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Atribuir Plano Manualmente</DialogTitle>
                                </DialogHeader>
                                <div className="py-4">
                                    <Select onValueChange={setSelectedPlanId} defaultValue={user.activePlanId || 'none'}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione um plano..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Nenhum (Plano Básico)</SelectItem>
                                            {plans.map(plan => (
                                                <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button type="button" variant="secondary">Cancelar</Button>
                                    </DialogClose>
                                    <Button onClick={handleAssignPlan} disabled={isSubmittingPlan}>
                                        {isSubmittingPlan && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Salvar Alterações
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                    <p>Plano atual: <span className="font-semibold">{user.activePlanName || 'Básico'}</span></p>
                </div>

                {isCompany && (
                    <>
                    <Separator />
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                           Atividade de Fretes
                        </h3>
                        {companyStats === null ? (
                             <div className="flex justify-center items-center h-24">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                             </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-3">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Fretes Ativos</CardTitle>
                                        <Package className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{companyStats.activeFreights}</div>
                                    </CardContent>
                                </Card>
                                 <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Solicitados</CardTitle>
                                        <PackageSearch className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{companyStats.requestedFreights}</div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
                                        <PackageCheck className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{companyStats.completedFreights}</div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>
                    </>
                )}
                
                {!isCompany && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Truck className="h-5 w-5" /> Veículos
                        </h3>
                        <p className="text-muted-foreground">Nenhum veículo cadastrado.</p>
                        {/* Futuramente, listar os veículos aqui */}
                    </div>
                  </>
                )}
                <Separator />
                 <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <FileText className="h-5 w-5" /> Documentos Enviados
                    </h3>
                    <div className="space-y-4">
                        {responsibleDocumentProps.url ? (
                             <div className="flex flex-wrap items-center justify-between gap-2 p-3 border rounded-md">
                                <div className='flex items-center gap-2'>
                                    {getDocStatusIcon(responsibleDocumentProps.status)}
                                    <span className={cn('font-medium text-sm', {'text-muted-foreground line-through': responsibleDocumentProps.status === 'rejected'})}>
                                        Documento do Responsável
                                    </span>
                                     <Badge variant="outline" className="capitalize">{getDocStatusLabel(responsibleDocumentProps.status)}</Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                    <a href={responsibleDocumentProps.url} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
                                        <ExternalLink className="mr-2 h-4 w-4" /> Ver
                                    </a>
                                     <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="sm">Ações</Button></DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onSelect={() => handleDocumentStatusChange('responsible.document', 'approved')} disabled={responsibleDocumentProps?.status === 'approved'}>Aprovar</DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => handleDocumentStatusChange('responsible.document', 'rejected')} disabled={responsibleDocumentProps?.status === 'rejected'}>Recusar</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">Documento do Responsável não enviado.</p>
                        )}
                        {cnpjCardProps.url ? (
                             <div className="flex flex-wrap items-center justify-between gap-2 p-3 border rounded-md">
                                 <div className='flex items-center gap-2'>
                                    {getDocStatusIcon(cnpjCardProps.status)}
                                    <span className={cn('font-medium text-sm', {'text-muted-foreground line-through': cnpjCardProps.status === 'rejected'})}>
                                        Cartão CNPJ
                                    </span>
                                     <Badge variant="outline" className="capitalize">{getDocStatusLabel(cnpjCardProps.status)}</Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                     <a href={cnpjCardProps.url} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
                                        <ExternalLink className="mr-2 h-4 w-4" /> Ver
                                    </a>
                                     <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="sm">Ações</Button></DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onSelect={() => handleDocumentStatusChange('cnpjCard', 'approved')} disabled={cnpjCardProps?.status === 'approved'}>Aprovar</DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => handleDocumentStatusChange('cnpjCard', 'rejected')} disabled={cnpjCardProps?.status === 'rejected'}>Recusar</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">Cartão CNPJ não enviado.</p>
                        )}
                         {!responsibleDocumentProps.url && !cnpjCardProps.url && (
                             <p className="text-muted-foreground text-sm">Nenhum documento enviado.</p>
                         )}
                    </div>
                </div>
            </CardContent>
        </Card>

    </div>
  );
}
