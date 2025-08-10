
import type { Metadata } from 'next';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { type Vehicle, type VehicleType, type VehicleCategory } from '@/app/actions';
import VehiclesClient from './vehicles-client';

export const metadata: Metadata = {
    title: 'Gerenciamento de Veículos | Frete7 Admin',
    description: 'Visualize e gerencie todos os veículos da plataforma.',
};

async function getVehiclesData(): Promise<{ vehicles: Vehicle[], vehicleTypes: VehicleType[], vehicleCategories: VehicleCategory[] }> {
    try {
        const vehiclesQuery = query(collection(db, 'vehicles'));
        const typesQuery = query(collection(db, 'vehicle_types'));
        const categoriesQuery = query(collection(db, 'vehicle_categories'));

        const [vehiclesSnap, typesSnap, categoriesSnap] = await Promise.all([
            getDocs(vehiclesQuery),
            getDocs(typesQuery),
            getDocs(categoriesQuery)
        ]);

        const vehicles = vehiclesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Vehicle));
        const vehicleTypes = typesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as VehicleType));
        const vehicleCategories = categoriesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as VehicleCategory));

        return { vehicles, vehicleTypes, vehicleCategories };
    } catch (error) {
        console.error("Error fetching vehicles data server-side:", error);
        return { vehicles: [], vehicleTypes: [], vehicleCategories: [] };
    }
}


export default async function AdminVehiclesPage() {
    const { vehicles, vehicleTypes, vehicleCategories } = await getVehiclesData();

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-headline text-primary">Gerenciamento de Veículos</h1>
                <p className="text-foreground/70">Adicione, edite ou remova os veículos cadastrados na plataforma.</p>
            </div>
            <VehiclesClient 
                initialVehicles={vehicles}
                initialVehicleTypes={vehicleTypes}
                initialVehicleCategories={vehicleCategories}
            />
        </div>
    );
}
