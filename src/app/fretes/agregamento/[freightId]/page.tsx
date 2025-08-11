

import { doc, getDoc, collection, query, where, getDocs, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notFound } from 'next/navigation';
import AgregamentoDetailsClient from './agregamento-details-client';

type AgregamentoDetailsPageProps = {
    params: {
        freightId: string;
    }
}

async function getFreightData(id: string) {
    const freightDocRef = doc(db, 'freights', id);
    
    // Inicia todas as buscas em paralelo
    const [freightSnap, bodyTypesSnap, vehicleTypesSnap] = await Promise.all([
        getDoc(freightDocRef),
        getDocs(collection(db, 'body_types')),
        getDocs(collection(db, 'vehicle_types'))
    ]);

    if (!freightSnap.exists()) {
        return { freight: null, bodyworkNames: [], vehicleNames: [] };
    }

    const freightData = freightSnap.data() as DocumentData;
    
    // Cria mapas para busca rápida, evitando múltiplos loops
    const bodyTypesMap = new Map(bodyTypesSnap.docs.map(doc => [doc.id, doc.data().name]));
    const vehicleTypesMap = new Map(vehicleTypesSnap.docs.map(doc => [doc.id, doc.data().name]));

    const requiredBodyworksIds = freightData.requiredBodyworks || [];
    const requiredVehiclesFromFreight = freightData.requiredVehicles || [];

    // Mapeia os IDs para nomes usando os mapas (operação rápida)
    const bodyworkNames = requiredBodyworksIds.map((id: string) => bodyTypesMap.get(id) || 'Carroceria Desconhecida');
    const vehicleNames = requiredVehiclesFromFreight.map((v: any) => vehicleTypesMap.get(v.id) || v.name || 'Veículo Desconhecido');

    // Serializa Timestamps
    Object.keys(freightData).forEach(key => {
        if (freightData[key]?.toDate) {
            freightData[key] = freightData[key].toDate().toISOString();
        }
    });

    return { 
        freight: { ...freightData, firestoreId: freightSnap.id, id: freightData.id }, 
        bodyworkNames, 
        vehicleNames 
    };
}


export default async function AgregamentoFreightDetailsPage({ params }: AgregamentoDetailsPageProps) {
    const { freight, bodyworkNames, vehicleNames } = await getFreightData(params.freightId);

    if (!freight) {
        notFound();
    }

    return <AgregamentoDetailsClient initialFreight={freight} initialBodyworkNames={bodyworkNames} initialVehicleNames={vehicleNames} />;
}
