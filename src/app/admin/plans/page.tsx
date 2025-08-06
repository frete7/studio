
import type { Metadata } from 'next';
import PlansClient from './plans-client';
import { getPlans } from '@/app/actions';

export const metadata: Metadata = {
    title: 'Gerenciamento de Planos | Frete7 Admin',
    description: 'Gerencie os planos e assinaturas da plataforma.',
};

export const revalidate = 0; // Force dynamic rendering

export default async function AdminPlansPage() {
    const plans = await getPlans();

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-headline text-primary">Gerenciamento de Planos</h1>
                <p className="text-foreground/70">Adicione, edite ou remova os planos de assinatura disponíveis para os usuários.</p>
            </div>
            <PlansClient initialPlans={plans} />
        </div>
    );
}
