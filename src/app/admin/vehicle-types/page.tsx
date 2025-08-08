
import type { Metadata } from 'next';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { type VehicleType, type VehicleCategory } from '@/app/actions';
import VehicleTypesClient from './vehicle-types-client';

export const metadata: Metadata = {
    title: 'Gerenciamento de Tipos de Veículos | Frete7 Admin',
    description: 'Gerencie os tipos de veículos da plataforma.',
};

async function getVehicleData() {
    try {
        const typesQuery = query(collection(db, 'vehicle_types'));
        const categoriesQuery = query(collection(db, 'vehicle_categories'));

        const [typesSnap, categoriesSnap] = await Promise.all([
            getDocs(typesQuery),
            getDocs(categoriesQuery)
        ]);

        const vehicleTypes = typesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as VehicleType));
        const vehicleCategories = categoriesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as VehicleCategory));

        return { vehicleTypes, vehicleCategories };
    } catch (error) {
        console.error("Error fetching vehicle data server-side:", error);
        return { vehicleTypes: [], vehicleCategories: [] };
    }
}

export default async function AdminVehicleTypesPage() {
    const { vehicleTypes, vehicleCategories } = await getVehicleData();

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-headline text-primary">Gerenciamento de Tipos de Veículos</h1>
                <p className="text-foreground/70">Adicione, edite ou remova os tipos de veículos e associe-os a uma categoria.</p>
            </div>
            <VehicleTypesClient initialTypes={vehicleTypes} initialCategories={vehicleCategories} />
        </div>
    );
}
