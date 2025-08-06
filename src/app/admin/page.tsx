
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, getCountFromServer, query, where, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Loader2, ShieldCheck, User, Users } from 'lucide-react';
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
};

export default function AdminDashboardPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/login');
        return;
      }

      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists() && userDoc.data().role === 'admin') {
        setUser(userDoc.data() as UserData);
        await fetchDashboardData();
      } else {
        router.push('/');
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [router]);
  
  const fetchDashboardData = async () => {
      try {
          const usersCollection = collection(db, 'users');
          const totalUsersSnapshot = await getCountFromServer(usersCollection);
          const totalUsers = totalUsersSnapshot.data().count;

          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const startOfToday = Timestamp.fromDate(today);

          const newUsersQuery = query(usersCollection, where('createdAt', '>=', startOfToday));
          const newUsersSnapshot = await getCountFromServer(newUsersQuery);
          const newUsersToday = newUsersSnapshot.data().count;
          
          // Placeholder for pending verifications logic
          const pendingVerificationsQuery = query(usersCollection, where('status', '==', 'pending'));
          const pendingVerificationsSnapshot = await getCountFromServer(pendingVerificationsQuery);
          const pendingVerifications = pendingVerificationsSnapshot.data().count;


          setStats({
              totalUsers,
              newUsersToday,
              pendingVerifications
          });

      } catch (error) {
          console.error("Error fetching dashboard data: ", error);
          // Handle error gracefully, maybe show a toast
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
    <div className="space-y-6">
       <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline text-primary">Dashboard</h1>
        <p className="text-foreground/70">Bem-vindo, {user?.name || 'Admin'}! Aqui está um resumo da plataforma.</p>
      </div>
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

       <div className="mt-12">
            <h2 className="text-2xl font-bold mb-4">Ações Rápidas</h2>
            {/* Aqui você pode adicionar botões para gerenciar usuários, fretes, etc. */}
       </div>
    </div>
  );
}
