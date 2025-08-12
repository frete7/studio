
import type { Metadata } from 'next';
import { collection, getDocs, query, limit, startAfter, DocumentSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // Assuming db is initialized here
import UsersClient from './users-client';

export const metadata: Metadata = {
    title: 'Gerenciamento de Usuários | Frete7 Admin',
    description: 'Visualize e gerencie os usuários da plataforma.',
};

async function getUsers() {
    // Default limit for the first page
    const DEFAULT_LIMIT = 20;

    try {
        let q = query(collection(db, 'users'), limit(DEFAULT_LIMIT));

        // If implementing proper pagination with startAfter in the server component
        // you would need to pass startAfterDocId from the client.
        // For simplicity in the initial server fetch, we just apply the limit.
        // Full pagination logic will be handled in the client component.

        const querySnapshot = await getDocs(q);

        // To get the last document for client-side pagination
        const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];

        const usersData = [];
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
    // Fetch the first page of users with a limit
    const initialUsers = await getUsers();

    // Note: Getting the total count efficiently requires aggregation or a separate counter.
    // getCountFromServer could be used, but adds latency.

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
