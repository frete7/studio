
'use client';

import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { notFound, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Mail, Phone, Calendar, User, ShieldCheck, Truck, FileText, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';

type UserPageProps = {
  params: {
    userId: string;
  };
};

type UserData = {
    uid: string;
    name: string;
    email: string;
    role: 'driver' | 'company' | 'admin';
    status?: 'active' | 'pending' | 'blocked' | 'suspended';
    createdAt: any;
    photoURL?: string;
    birthDate?: string;
    cnh?: string;
    cnhCategory?: string;
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


export default function UserDetailsPage({ params }: UserPageProps) {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/login');
        return;
      }
      // First, verify if the logged-in user is an admin
      const adminDocRef = doc(db, 'users', currentUser.uid);
      const adminDoc = await getDoc(adminDocRef);

      if (!adminDoc.exists() || adminDoc.data().role !== 'admin') {
        router.push('/'); // Redirect if not admin
        return;
      }

      // If admin, fetch the user data for the page
      const userDocRef = doc(db, 'users', params.userId);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        setUser(userDoc.data() as UserData);
      } else {
        notFound();
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [params.userId, router]);


  if (isLoading || !user) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon">
                <Link href="/admin/users">
                    <ArrowLeft className="h-4 w-4" />
                </Link>
            </Button>
            <h1 className="text-2xl font-bold">Detalhes do Usuário</h1>
        </div>

        <Card>
            <CardHeader>
                <div className="flex items-start gap-6">
                    <Avatar className="h-24 w-24 border-2 border-primary">
                        <AvatarImage src={user.photoURL ?? `https://avatar.vercel.sh/${user.email}.png`} alt={user.name} />
                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <div className="flex items-center gap-4">
                            <CardTitle className="text-3xl">{user.name}</CardTitle>
                            <Badge variant={getStatusVariant(user.status)} className="text-sm">
                                {getStatusLabel(user.status)}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground capitalize">{user.role}</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <Separator />
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
                <Separator />
                 <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Truck className="h-5 w-5" /> Veículos
                    </h3>
                    <p className="text-muted-foreground">Nenhum veículo cadastrado.</p>
                    {/* Futuramente, listar os veículos aqui */}
                </div>
                <Separator />
                 <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <FileText className="h-5 w-5" /> Documentos
                    </h3>
                    <p className="text-muted-foreground">Nenhum documento enviado.</p>
                     {/* Futuramente, listar os documentos aqui */}
                </div>
            </CardContent>
        </Card>

    </div>
  );
}
