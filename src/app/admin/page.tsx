
'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, getCountFromServer, query, where, Timestamp } from 'firebase/firestore';
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

export default function AdminDashboardPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // The layout now handles authorization. We just need to fetch the data.
    const currentUser = auth.currentUser;
    if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        getDoc(userDocRef).then(userDoc => {
            if (userDoc.exists()) {
                setUser(userDoc.data() as UserData);
            }
        });
        fetchDashboardData();
    }
  }, []);
  
  const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
          // User stats
          const usersCollection = collection(db, 'users');
          const totalUsersSnapshot = await getCountFromServer(usersCollection);
          const totalUsers = totalUsersSnapshot.data().count;

          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const startOfToday = Timestamp.fromDate(today);

          const newUsersQuery = query(usersCollection, where('createdAt', '>=', startOfToday));
          const newUsersSnapshot = await getCountFromServer(newUsersQuery);
          const newUsersToday = newUsersSnapshot.data().count;
          
          const pendingVerificationsQuery = query(usersCollection, where('status', '==', 'pending'));
          const pendingVerificationsSnapshot = await getCountFromServer(pendingVerificationsQuery);
          const pendingVerifications = pendingVerificationsSnapshot.data().count;

          // Freight stats (assuming a 'freights' collection and 'status' field)
          const freightsCollection = collection(db, 'freights');
          
          const activeFreightsQuery = query(freightsCollection, where('status', '==', 'active'));
          const activeFreightsSnapshot = await getCountFromServer(activeFreightsQuery);
          const activeFreights = activeFreightsSnapshot.data().count;

          const requestedFreightsQuery = query(freightsCollection, where('status', '==', 'requested'));
          const requestedFreightsSnapshot = await getCountFromServer(requestedFreightsQuery);
          const requestedFreights = requestedFreightsSnapshot.data().count;

          const completedFreightsQuery = query(freightsCollection, where('status', '==', 'completed'));
          const completedFreightsSnapshot = await getCountFromServer(completedFreightsQuery);
          const completedFreights = completedFreightsSnapshot.data().count;

          setStats({
              totalUsers,
              newUsersToday,
              pendingVerifications,
              activeFreights,
              requestedFreights,
              completedFreights,
          });

      } catch (error) {
          console.error("Error fetching dashboard data: ", error);
          if (!stats) {
            setStats({
              totalUsers: 0,
              newUsersToday: 0,
              pendingVerifications: 0,
              activeFreights: 0,
              requestedFreights: 0,
              completedFreights: 0,
            })
          }
      } finally {
        setIsLoading(false);
      }
  };


  if (isLoading || !stats) {
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
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">Total de usuários cadastrados</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Novos Cadastros (Hoje)</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{stats.newUsersToday}</div>
              <p className="text-xs text-muted-foreground">Usuários cadastrados hoje</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Verificações Pendentes</CardTitle>
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingVerifications}</div>
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
              <div className="text-2xl font-bold">{stats.activeFreights}</div>
              <p className="text-xs text-muted-foreground">Fretes disponíveis no momento</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fretes Solicitados</CardTitle>
              <PackageSearch className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.requestedFreights}</div>
              <p className="text-xs text-muted-foreground">Negociações em andamento</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fretes Concluídos</CardTitle>
              <PackageCheckIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedFreights}</div>
              <p className="text-xs text-muted-foreground">Total de fretes já realizados</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
