
'use client';

import { collection, doc, getDoc, getCountFromServer, query, updateDoc, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { notFound, useRouter, useParams } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Mail, Phone, Calendar, User, ShieldCheck, Truck, FileText, ArrowLeft, Loader2, MoreVertical, Building, Landmark, CaseSensitive, Package, PackageSearch, PackageCheck, CreditCard, Pencil, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { updateUserStatus, assignPlanToUser, getPlans, type Plan } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';


type UserData = {
    uid: string;
    name: string;
    email: string;
    role: 'driver' | 'company' | 'admin';
    status?: 'active' | 'pending' | 'blocked' | 'suspended';
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
    activePlanName?: string;
    activePlanId?: string;
    responsible?: {
        name: string;
        cpf: string;
        documentUrl?: string;
    };
    cnpjCardUrl?: string;
};

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
        default: return 'secondary';
    }
};

const getStatusLabel = (status?: string): string => {
    switch (status) {
        case 'active': return 'Ativo';
        case 'pending': return 'Pendente';
        case 'blocked': return 'Bloqueado';
        case 'suspended': return 'Suspenso';
        default: return 'Indefinido';
    }
}

const userStatuses: (UserData['status'])[] = ['active', 'pending', 'blocked', 'suspended'];


export default function UserDetailsPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [companyStats, setCompanyStats] = useState<CompanyStats | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [isSubmittingPlan, setIsSubmittingPlan] = useState(false);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  const { toast } = useToast();


  useEffect(() => {
    if (!userId) return;
    
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

    const authUnsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/login');
        return;
      }
      const adminDocRef = doc(db, 'users', currentUser.uid);
      const adminDoc = await getDoc(adminDocRef);

      if (!adminDoc.exists() || adminDoc.data().role !== 'admin') {
        router.push('/');
        return;
      }

      // If user is admin, set up the listener for the user's document
      const userDocRef = doc(db, 'users', userId);
      const userUnsubscribe = onSnapshot(userDocRef, (doc) => {
         if (doc.exists()) {
            const userData = { ...doc.data(), uid: doc.id } as UserData;
            setUser(userData);
            setSelectedPlanId(userData.activePlanId || '');
            if (userData.role === 'company') {
                fetchCompanyStats(userData.uid);
            }
            fetchPlansData(userData.role);
        } else {
            notFound();
        }
        setIsLoading(false);
      });
      
      // Return cleanup function for user listener
      return () => userUnsubscribe();
    });

    // Return cleanup function for auth listener
    return () => authUnsubscribe();
  }, [userId, router, toast]);
  
  const handleStatusChange = async (newStatus: UserData['status']) => {
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
            description: "Não foi possível alterar o status do usuário.",
        });
        console.error("Failed to update user status:", error);
    }
  };
  
  const handleAssignPlan = async () => {
      if (!user) return;
      
      setIsSubmittingPlan(true);
      try {
          const planIdToAssign = selectedPlanId;
          const selectedPlan = plans.find(p => p.id === planIdToAssign);
          const planName = selectedPlan ? selectedPlan.name : 'Básico'; // Handle 'none' case

          await assignPlanToUser(user.uid, planIdToAssign, planName);
          toast({ title: 'Sucesso!', description: 'Plano atribuído ao usuário.' });
          setIsPlanDialogOpen(false);
      } catch (error) {
          toast({
              variant: 'destructive',
              title: 'Erro ao atribuir plano',
              description: error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.',
          });
      } finally {
          setIsSubmittingPlan(false);
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
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Moderar Usuário
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Alterar Status</DropdownMenuLabel>
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
                                    <Select onValueChange={setSelectedPlanId} defaultValue={user.activePlanId || ''}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione um plano..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">Nenhum (Plano Básico)</SelectItem>
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
                    <div className="space-y-2">
                        {user.responsible?.documentUrl ? (
                            <a href={user.responsible.documentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                                <ExternalLink className="h-4 w-4" />
                                Documento do Responsável
                            </a>
                        ) : (
                            <p className="text-sm text-muted-foreground">Documento do Responsável não enviado.</p>
                        )}
                        {user.cnpjCardUrl ? (
                             <a href={user.cnpjCardUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                                <ExternalLink className="h-4 w-4" />
                                Cartão CNPJ
                            </a>
                        ) : (
                            <p className="text-sm text-muted-foreground">Cartão CNPJ não enviado.</p>
                        )}
                         {!user.responsible?.documentUrl && !user.cnpjCardUrl && (
                             <p className="text-muted-foreground text-sm">Nenhum documento enviado.</p>
                         )}
                    </div>
                </div>
            </CardContent>
        </Card>

    </div>
  );
}

    