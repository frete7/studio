
import type { Metadata } from 'next';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { type BodyType, type Vehicle, type VehicleCategory, getFreightsByCompany, getFilteredFreights } from '@/app/actions';
import FretesClient from './fretes-client';

export const metadata: Metadata = {
    title: 'Buscar Fretes | Frete7',
    description: 'Encontre as melhores oportunidades de frete em todo o Brasil.',
};

// Helper function to serialize Firestore Timestamps in nested objects
const serializeTimestamps = (data: any) => {
    for (const key in data) {
        if (data[key] instanceof Timestamp) {
            data[key] = data[key].toDate().toISOString();
        } else if (typeof data[key] === 'object' && data[key] !== null) {
            serializeTimestamps(data[key]);
        }
    }
    return data;
};


async function getFretesInitialData() {
    try {
        // Fetch initial freights (unfiltered)
        const initialFreights = await getFilteredFreights({});

        const bodyTypesQuery = query(collection(db, 'body_types'));
        const vehicleTypesQuery = query(collection(db, 'vehicle_types'));
        const vehicleCategoriesQuery = query(collection(db, 'vehicle_categories'));

        const [bodyTypesSnap, vehicleTypesSnap, vehicleCategoriesSnap] = await Promise.all([
            getDocs(bodyTypesQuery),
            getDocs(vehicleTypesQuery),
            getDocs(vehicleCategoriesQuery),
        ]);

        const allBodyTypes = bodyTypesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as BodyType));
        const allVehicleTypes = vehicleTypesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as any));
        const allVehicleCategories = vehicleCategoriesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as VehicleCategory));
        
        // Serialize any Timestamps before passing to the client component
        const serializedFreights = initialFreights.map(freight => serializeTimestamps(freight));

        return { initialFreights: serializedFreights, allBodyTypes, allVehicleTypes, allVehicleCategories };
    } catch (error) {
        console.error("Error fetching initial fretes data:", error);
        return { initialFreights: [], allBodyTypes: [], allVehicleTypes: [], allVehicleCategories: [] };
    }
}


export default async function FretesPage() {
    const initialData = await getFretesInitialData();

    return (
        <div className="container mx-auto px-4 py-8">
            <FretesClient 
                initialFreights={initialData.initialFreights}
                initialBodyTypes={initialData.allBodyTypes}
                initialVehicleTypes={initialData.allVehicleTypes}
                initialVehicleCategories={initialData.allVehicleCategories}
            />
        </div>
    );
}
