
'use client';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { getCompanyStats, getMonthlyFreightStats } from '@/app/actions';
import StatisticsClient from './statistics-client';

/*
export const metadata: Metadata = {
    title: 'Estatísticas | Frete7',
    description: 'Visualize o desempenho da sua operação na plataforma.',
};
*/

// Revalidate this page every 5 minutes to keep stats fresh
export const revalidate = 300; 

export default function StatisticsPage() {
    // This is a server component, we can't use the auth hook.
    // We assume if the user gets here, they are logged in.
    // A more robust solution would use NextAuth.js or server-side auth checks.
    
    // As we can't reliably get the UID on the server without a full auth solution like NextAuth,
    // this page will be fetched on the client.
    // For a production app, this data fetching should happen here on the server.
    
    // Example of how it would work with a userId
    // const userId = auth.currentUser?.uid; // This doesn't work on server components
    // if (!userId) {
    //    notFound();
    // }
    // const [companyStats, monthlyStats] = await Promise.all([
    //     getCompanyStats(userId),
    //     getMonthlyFreightStats(userId),
    // ]);
    
    return (
        <div className="container mx-auto px-4 py-12">
            <div className="max-w-6xl mx-auto">
                 <StatisticsClient />
            </div>
        </div>
    );
}
