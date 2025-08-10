
import { getCountFromServer, collection, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, ShieldCheck, User, Users, Package, PackageSearch, PackageCheck as PackageCheckIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AdminDashboardClient from './dashboard-client';

type DashboardStats = {
    totalUsers: number;
    newUsersToday: number;
    pendingVerifications: number;
    activeFreights: number;
    requestedFreights: number;
    completedFreights: number;
};

async function getDashboardData(): Promise<DashboardStats> {
    try {
        // User stats
        const usersCollection = collection(db, 'users');
        const totalUsersSnapshot = await getCountFromServer(usersCollection);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startOfToday = Timestamp.fromDate(today);

        const newUsersQuery = query(usersCollection, where('createdAt', '>=', startOfToday));
        const newUsersSnapshot = await getCountFromServer(newUsersQuery);
        
        const pendingVerificationsQuery = query(usersCollection, where('status', '==', 'pending'));
        const pendingVerificationsSnapshot = await getCountFromServer(pendingVerificationsQuery);

        // Freight stats
        const freightsCollection = collection(db, 'freights');
        const activeFreightsQuery = query(freightsCollection, where('status', '==', 'active'));
        const activeFreightsSnapshot = await getCountFromServer(activeFreightsQuery);

        const requestedFreightsQuery = query(freightsCollection, where('status', '==', 'requested'));
        const requestedFreightsSnapshot = await getCountFromServer(requestedFreightsQuery);

        const completedFreightsQuery = query(freightsCollection, where('status', '==', 'completed'));
        const completedFreightsSnapshot = await getCountFromServer(completedFreightsQuery);
        
        return {
            totalUsers: totalUsersSnapshot.data().count,
            newUsersToday: newUsersSnapshot.data().count,
            pendingVerifications: pendingVerificationsSnapshot.data().count,
            activeFreights: activeFreightsSnapshot.data().count,
            requestedFreights: requestedFreightsSnapshot.data().count,
            completedFreights: completedFreightsSnapshot.data().count,
        };

    } catch (error) {
        console.error("Error fetching dashboard data on server:", error);
        // Return zeroed stats on error
        return {
            totalUsers: 0,
            newUsersToday: 0,
            pendingVerifications: 0,
            activeFreights: 0,
            requestedFreights: 0,
            completedFreights: 0,
        };
    }
}


export default async function AdminDashboardPage() {
  const initialStats = await getDashboardData();

  return (
    <AdminDashboardClient initialStats={initialStats} />
  );
}
