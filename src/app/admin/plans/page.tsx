
import type { Metadata } from 'next';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import PlansClient from './plans-client';
import { type Plan } from '@/app/actions';

export const metadata: Metadata = {
    title: 'Gerenciamento de Planos | Frete7 Admin',
    description: 'Gerencie os planos e assinaturas da plataforma.',
};

async function getPlansData(): Promise<Plan[]> {
    try {
        const plansCollection = collection(db, 'plans');
        const snapshot = await getDocs(plansCollection);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plan));
    } catch (error) {
        console.error("Error fetching plans server-side: ", error);
        return []; // Retorna vazio em caso de erro
    }
}


export default async function AdminPlansPage() {
    const initialPlans = await getPlansData();

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-headline text-primary">Gerenciamento de Planos</h1>
                <p className="text-foreground/70">Adicione, edite ou remova os planos de assinatura disponíveis para os usuários.</p>
            </div>
            <PlansClient initialData={initialPlans} />
        </div>
    );
}
