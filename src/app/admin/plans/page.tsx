
import type { Metadata } from 'next';
import { getPlans, type Plan } from '@/app/actions';
import PlansClient from './plans-client';

export const metadata: Metadata = {
    title: 'Gerenciamento de Planos | Frete7 Admin',
    description: 'Gerencie os planos e assinaturas da plataforma.',
};

async function getPlansData(): Promise<Plan[]> {
    try {
        const plans = await getPlans();
        return plans;
    } catch (error) {
        console.error("Error fetching plans server-side: ", error);
        return [];
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
