
import type { Metadata } from 'next';
import VehiclesClient from './vehicles-client';

export const metadata: Metadata = {
    title: 'Gerenciamento de Veículos | Frete7 Admin',
    description: 'Visualize e gerencie todos os veículos da plataforma.',
};

export default function AdminVehiclesPage() {
    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-headline text-primary">Gerenciamento de Veículos</h1>
                <p className="text-foreground/70">Adicione, edite ou remova os veículos cadastrados na plataforma.</p>
            </div>
            <VehiclesClient />
        </div>
    );
}

    