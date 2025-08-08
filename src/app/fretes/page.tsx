
import type { Metadata } from 'next';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { type BodyType, type Vehicle, type VehicleCategory } from '@/app/actions';
import FretesClient from './fretes-client';

export const metadata: Metadata = {
    title: 'Buscar Fretes | Frete7',
    description: 'Encontre as melhores oportunidades de frete em todo o Brasil.',
};

async function getFretesInitialData() {
    try {
        const freightsQuery = query(collection(db, 'freights'), where('status', '==', 'ativo'));
        const bodyTypesQuery = query(collection(db, 'body_types'));
        const vehicleTypesQuery = query(collection(db, 'vehicle_types'));
        const vehicleCategoriesQuery = query(collection(db, 'vehicle_categories'));

        const [freightsSnap, bodyTypesSnap, vehicleTypesSnap, vehicleCategoriesSnap] = await Promise.all([
            getDocs(freightsQuery),
            getDocs(bodyTypesQuery),
            getDocs(vehicleTypesQuery),
            getDocs(vehicleCategoriesQuery),
        ]);

        const freights = freightsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as any));
        const allBodyTypes = bodyTypesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as BodyType));
        const allVehicleTypes = vehicleTypesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as any));
        const allVehicleCategories = vehicleCategoriesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as VehicleCategory));

        return { freights, allBodyTypes, allVehicleTypes, allVehicleCategories };
    } catch (error) {
        console.error("Error fetching initial fretes data:", error);
        return { freights: [], allBodyTypes: [], allVehicleTypes: [], allVehicleCategories: [] };
    }
}


export default async function FretesPage() {
    const initialData = await getFretesInitialData();

    return (
        <div className="container mx-auto px-4 py-8">
            <FretesClient 
                initialFreights={initialData.freights}
                initialBodyTypes={initialData.allBodyTypes}
                initialVehicleTypes={initialData.allVehicleTypes}
                initialVehicleCategories={initialData.allVehicleCategories}
            />
        </div>
    );
}
