
import type { Metadata } from 'next';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { type BodyType, type Vehicle, type VehicleCategory, getFilteredFreights } from '@/app/actions';
import { Suspense, lazy } from 'react';

// Lazy load do componente cliente para melhorar performance inicial
const FretesClient = lazy(() => import('./fretes-client'));

export const metadata: Metadata = {
    title: 'Buscar Fretes | Frete7',
    description: 'Encontre as melhores oportunidades de frete em todo o Brasil.',
};

// Helper function to serialize Firestore Timestamps in nested objects
const serializeData = (data: any): any => {
    if (!data) return data;
    if (Array.isArray(data)) {
        return data.map(serializeData);
    }
    if (data instanceof Timestamp) {
        return data.toDate().toISOString();
    }
    if (typeof data === 'object' && data !== null) {
        const serialized: { [key: string]: any } = {};
        for (const key in data) {
            serialized[key] = serializeData(data[key]);
        }
        return serialized;
    }
    return data;
};

// Componente de loading para o cliente
const FretesClientLoader = () => (
  <div className="container mx-auto px-4 py-8">
    <div className="space-y-6">
      <div className="h-8 bg-muted rounded animate-pulse w-1/3"></div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-48 bg-muted rounded animate-pulse"></div>
        ))}
      </div>
    </div>
  </div>
);

async function getFretesInitialData() {
    try {
        // Fetch initial freights (unfiltered) - limitar para melhorar performance
        const initialFreights = await getFilteredFreights({ limit: 20 });

        // Carregar dados em paralelo para melhorar performance
        const [bodyTypesSnap, vehicleTypesSnap, vehicleCategoriesSnap] = await Promise.all([
            getDocs(query(collection(db, 'body_types'))),
            getDocs(query(collection(db, 'vehicle_types'))),
            getDocs(query(collection(db, 'vehicle_categories'))),
        ]);

        const allBodyTypes = bodyTypesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as BodyType));
        const allVehicleTypes = vehicleTypesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as any));
        const allVehicleCategories = vehicleCategoriesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as VehicleCategory));
        
        // Serialize any Timestamps before passing to the client component
        const serializedFreights = initialFreights.map(freight => serializeData(freight));

        return { initialFreights: serializedFreights, allBodyTypes, allVehicleTypes, allVehicleCategories };
    } catch (error) {
        console.error("Error fetching initial fretes data:", error);
        return { initialFreights: [], allBodyTypes: [], allVehicleTypes: [], allVehicleCategories: [] };
    }
}

export default async function FretesPage() {
    const initialData = await getFretesInitialData();

    return (
        <Suspense fallback={<FretesClientLoader />}>
            <div className="container mx-auto px-4 py-8">
                <FretesClient 
                    initialFreights={initialData.initialFreights}
                    initialBodyTypes={initialData.allBodyTypes}
                    initialVehicleTypes={initialData.allVehicleTypes}
                    initialVehicleCategories={initialData.allVehicleCategories}
                />
            </div>
        </Suspense>
    );
}
