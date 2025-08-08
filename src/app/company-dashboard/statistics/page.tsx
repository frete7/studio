
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { getCompanyStats, getMonthlyFreightStats } from '@/app/actions';
import StatisticsClient from './statistics-client';

export const metadata: Metadata = {
    title: 'Estatísticas | Frete7',
    description: 'Visualize o desempenho da sua operação na plataforma.',
};


export default async function StatisticsPage() {
    // This is a server component, so we can't use the auth hook.
    // We assume if the user gets here, they are logged in.
    // A more robust solution would use NextAuth.js or server-side auth checks.
    const currentUser = auth.currentUser;
    // For this example, we'll proceed, but in a real app you'd get the user from the session
    // const session = await getSession();
    // const userId = session?.user?.id;
    // if (!userId) notFound();

    // Since we can't get the current user reliably on the server without a session provider like NextAuth,
    // we will have the client component fetch the data. In a real scenario with proper auth,
    // we would fetch the data here and pass it to the client.

    // const companyStats = await getCompanyStats(userId);
    // const monthlyStats = await getMonthlyFreightStats(userId);
    

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="max-w-6xl mx-auto">
                 <StatisticsClient />
            </div>
        </div>
    );
}

