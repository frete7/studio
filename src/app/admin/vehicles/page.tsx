
import type { Metadata } from 'next';
import { collection, getDocs, query, limit, orderBy, startAfter, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // Assuming '@/lib/firebase' is the correct path
import { type Vehicle, type VehicleType, type VehicleCategory } from '@/app/actions';
import VehiclesClient from './vehicles-client';

export const metadata: Metadata = {
    title: 'Gerenciamento de Veículos | Frete7 Admin',
    description: 'Visualize e gerencie todos os veículos da plataforma.',
};

interface GetVehiclesDataParams {
    limit: number;
    startAfterDocId?: string;
}

async function getVehiclesData({ limit: fetchLimit, startAfterDocId }: GetVehiclesDataParams): Promise<{ vehicles: Vehicle[], vehicleTypes: VehicleType[], vehicleCategories: VehicleCategory[] }> {
    try {
        let vehiclesQuery = query(collection(db, 'vehicles'), orderBy('model'), limit(fetchLimit)); // Ordering by 'model' or 'licensePlate' is crucial for pagination

        if (startAfterDocId) {
            const startAfterDocSnap = await getDoc(doc(db, 'vehicles', startAfterDocId));
            if (startAfterDocSnap.exists()) {
                vehiclesQuery = query(collection(db, 'vehicles'), orderBy('model'), startAfter(startAfterDocSnap), limit(fetchLimit));
            }
        }

        const typesQuery = query(collection(db, 'vehicle_types'));
        const categoriesQuery = query(collection(db, 'vehicle_categories'));

        const [vehiclesSnap, typesSnap, categoriesSnap] = await Promise.all([
            getDocs(vehiclesQuery),
            getDocs(typesQuery), // Fetch all types
            getDocs(categoriesQuery) // Fetch all categories
        ]);

        const vehicles = vehiclesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Vehicle)); // These are the paginated vehicles
        const vehicleTypes = typesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as VehicleType));
        const vehicleCategories = categoriesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as VehicleCategory));

        return { vehicles, vehicleTypes, vehicleCategories };
    } catch (error) {
        console.error("Error fetching vehicles data server-side:", error);
        return { vehicles: [], vehicleTypes: [], vehicleCategories: [] };
    }
}


const VEHICLES_PER_PAGE = 20; // Define a default limit for the page

export default async function AdminVehiclesPage() {
    const { vehicles, vehicleTypes, vehicleCategories } = await getVehiclesData({ limit: VEHICLES_PER_PAGE });

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
