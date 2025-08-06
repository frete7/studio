
import type { Metadata } from 'next';
import VehiclesClient from './vehicles-client';
import { getVehicles, getVehicleTypes, getVehicleCategories } from '@/app/actions';

export const metadata: Metadata = {
    title: 'Gerenciamento de Veículos | Frete7 Admin',
    description: 'Visualize e gerencie todos os veículos da plataforma.',
};

export const revalidate = 0; // Force dynamic rendering

export default async function AdminVehiclesPage() {
    // Fetch all necessary data in parallel
    const [vehicles, vehicleTypes, vehicleCategories] = await Promise.all([
        getVehicles(),
        getVehicleTypes(),
        getVehicleCategories(),
    ]);

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-headline text-primary">Gerenciamento de Veículos</h1>
                <p className="text-foreground/70">Adicione, edite ou remova os veículos cadastrados na plataforma.</p>
            </div>
            <VehiclesClient
                initialVehicles={vehicles}
                vehicleTypes={vehicleTypes}
                vehicleCategories={vehicleCategories}
            />
        </div>
    );
}
