
import type { Metadata } from 'next';
import VehiclesClient from './vehicles-client';
import { getVehicleTypes } from '@/app/actions';

export const metadata: Metadata = {
    title: 'Gerenciamento de Veículos | Frete7 Admin',
    description: 'Gerencie os tipos de veículos da plataforma.',
};

// This page is forced to be dynamic to re-fetch data on demand.
export const revalidate = 0;

export default async function AdminVehiclesPage() {
    const vehicleTypes = await getVehicleTypes();

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-headline text-primary">Gerenciamento de Tipos de Veículos</h1>
                <p className="text-foreground/70">Adicione, edite ou remova os tipos de veículos disponíveis na plataforma.</p>
            </div>
            <VehiclesClient initialData={vehicleTypes} />
        </div>
    );
}
