
import type { Metadata } from 'next';
import { collection, getDocs, query, Timestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // Assuming db is imported from '@/lib/firebase'
import { type Freight } from '@/app/actions';
import FreightsClient from './freights-client';

export const metadata: Metadata = {
    title: 'Gerenciamento de Fretes | Frete7 Admin',
    description: 'Monitore e gerencie todos os fretes anunciados na plataforma.',
};

async function getFreights(status?: Freight['status']): Promise<Freight[]> {
    try {
        const q = status ? query(collection(db, 'freights'), where('status', '==', status)) : query(collection(db, 'freights'));

        const querySnapshot = await getDocs(q);
        const data: Freight[] = [];
        querySnapshot.forEach((doc) => {
            const freightData = doc.data() as any;
            // Firestore Timestamps are not serializable, so we convert them to ISO strings
            const createdAt = freightData.createdAt instanceof Timestamp
                ? freightData.createdAt.toDate().toISOString()
                : null;

            data.push({ ...freightData, id: doc.id, createdAt } as Freight);
        });
        return data;
    } catch (error: any) {
        console.error("Error fetching freights server-side:", error);
        return [];
    }
}

export default async function AdminFreightsPage() {
  return (
    <div>
        <div className="mb-8">
            <h1 className="text-3xl font-bold font-headline text-primary">Gerenciamento de Fretes</h1>
            <p className="text-foreground/70">Monitore e gerencie todos os fretes anunciados.</p>
        </div>
        <FreightsClient
            initialActiveFreights={await getFreights('ativo')}
            initialPendingFreights={await getFreights('pendente')}
            initialConcludedFreights={await getFreights('concluido')}
            initialCanceledFreights={await getFreights('cancelado')} />
    </div>
  );
}
