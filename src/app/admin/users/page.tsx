
import type { Metadata } from 'next';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import UsersClient from './users-client';

export const metadata: Metadata = {
    title: 'Gerenciamento de Usuários | Frete7 Admin',
    description: 'Visualize e gerencie os usuários da plataforma.',
};

async function getUsers() {
    try {
        const q = query(collection(db, 'users'));
        const querySnapshot = await getDocs(q);
        const usersData: any[] = [];
        querySnapshot.forEach((doc) => {
            usersData.push({ ...doc.data(), uid: doc.id } as any);
        });
        return usersData;
    } catch (error) {
        console.error("Error fetching users server-side:", error);
        return [];
    }
}


export default async function AdminUsersPage() {
    const initialUsers = await getUsers();

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-headline text-primary">Gerenciamento de Usuários</h1>
                <p className="text-foreground/70">Visualize e gerencie todos os motoristas e empresas cadastrados.</p>
            </div>
            <UsersClient initialData={initialUsers} />
        </div>
    );
}
