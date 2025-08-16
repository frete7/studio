'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Loader2, ShieldCheck, User, Users, Package, PackageSearch, PackageCheck as PackageCheckIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type UserData = {
  name: string;
  email: string;
  role: string;
};

type DashboardStats = {
    totalUsers: number;
    newUsersToday: number;
    pendingVerifications: number;
    activeFreights: number;
    requestedFreights: number;
    completedFreights: number;
};

export default function AdminDashboardClient({ initialStats }: { initialStats: DashboardStats }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [isLoading, setIsLoading] = useState(true);

  // Memoizar stats para evitar re-renderizações desnecessárias
  const memoizedStats = useMemo(() => stats, [stats]);

  useEffect(() => {
    let isMounted = true;
    
    const currentUser = auth.currentUser;
    if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const unsubscribe = onSnapshot(userDocRef, (doc) => {
            if (isMounted && doc.exists()) {
                setUser(doc.data() as UserData);
            }
        });
        setIsLoading(false);
        return () => {
          isMounted = false;
          unsubscribe();
        };
    } else {
        setIsLoading(false);
    }
  }, []);
  
  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-12rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
       <div>
        <h1 className="text-3xl font-bold font-headline text-primary">Dashboard</h1>
        <p className="text-foreground/70">Bem-vindo, {user?.name || 'Admin'}! Aqui está um resumo da plataforma.</p>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-foreground">Visão Geral de Usuários</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuários Totais</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{memoizedStats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">Total de usuários cadastrados</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Novos Cadastros (Hoje)</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{memoizedStats.newUsersToday}</div>
              <p className="text-xs text-muted-foreground">Usuários cadastrados hoje</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Verificações Pendentes</CardTitle>
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{memoizedStats.pendingVerifications}</div>
              <p className="text-xs text-muted-foreground">Perfis aguardando aprovação</p>
            </CardContent>
          </Card>
        </div>
      </div>

       <div className="space-y-6">
        <h2 className="text-xl font-semibold text-foreground">Visão Geral de Fretes</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fretes Ativos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{memoizedStats.activeFreights}</div>
              <p className="text-xs text-muted-foreground">Fretes disponíveis no momento</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fretes Solicitados</CardTitle>
              <PackageSearch className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{memoizedStats.requestedFreights}</div>
              <p className="text-xs text-muted-foreground">Negociações em andamento</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fretes Concluídos</CardTitle>
              <PackageCheckIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{memoizedStats.completedFreights}</div>
              <p className="text-xs text-muted-foreground">Total de fretes já realizados</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
