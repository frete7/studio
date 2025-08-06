
import type { Metadata } from 'next';
import VehicleTypesClient from './vehicle-types-client';
import { getVehicleCategories, getVehicleTypes } from '@/app/actions';

export const metadata: Metadata = {
    title: 'Gerenciamento de Tipos de Veículos | Frete7 Admin',
    description: 'Gerencie os tipos de veículos da plataforma.',
};

// This page is forced to be dynamic to re-fetch data on demand.
export const revalidate = 0;

export default async function AdminVehicleTypesPage() {
    const [vehicleTypes, vehicleCategories] = await Promise.all([
        getVehicleTypes(),
        getVehicleCategories()
    ]);

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-headline text-primary">Gerenciamento de Tipos de Veículos</h1>
                <p className="text-foreground/70">Adicione, edite ou remova os tipos de veículos e associe-os a uma categoria.</p>
            </div>
            <VehicleTypesClient 
                initialVehicleTypes={vehicleTypes}
                vehicleCategories={vehicleCategories}
            />
        </div>
    );
}
