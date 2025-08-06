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

export default function AdminPage() {
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
        // Fetch dashboard data only if user is admin
        fetchDashboardData();
      } else {
        // Not an admin or doc doesn't exist, redirect
        router.push('/');
        setIsLoading(false);
      }
    });
    
    const fetchDashboardData = async () => {
        try {
            // Get total users
            const usersCollection = collection(db, 'users');
            const totalUsersSnapshot = await getCountFromServer(usersCollection);
            const totalUsers = totalUsersSnapshot.data().count;

            // Get new users today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const startOfToday = Timestamp.fromDate(today);

            const newUsersQuery = query(usersCollection, where('createdAt', '>=', startOfToday));
            const newUsersSnapshot = await getCountFromServer(newUsersQuery);
            const newUsersToday = newUsersSnapshot.data().count;
            
            // Placeholder for pending verifications
            const pendingVerifications = 0;

            setStats({
                totalUsers,
                newUsersToday,
                pendingVerifications
            });

        } catch (error) {
            console.error("Error fetching dashboard data: ", error);
        } finally {
            setIsLoading(false);
        }
    };

    return () => unsubscribe();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // This state should ideally not be reached due to redirects
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline text-primary">Painel do Administrador</h1>
        <p className="text-foreground/70">Bem-vindo, {user.name}!</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Totais</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers ?? <Loader2 className="h-6 w-6 animate-spin" />}</div>
            <p className="text-xs text-muted-foreground">Total de usuários cadastrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Novos Cadastros (Hoje)</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats?.newUsersToday ?? <Loader2 className="h-6 w-6 animate-spin" />}</div>
             <p className="text-xs text-muted-foreground">Usuários cadastrados hoje</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verificações Pendentes</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingVerifications ?? <Loader2 className="h-6 w-6 animate-spin" />}</div>
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
