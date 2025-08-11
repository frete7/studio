
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notFound } from 'next/navigation';
import AgregamentoDetailsClient from './agregamento-details-client';
import { type Freight } from '@/app/actions';


type AgregamentoDetailsPageProps = {
    params: {
        freightId: string;
    }
}

async function getFreightData(id: string) {
    const docRef = doc(db, 'freights', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        return { freight: null, bodyworkNames: [], vehicleNames: [] };
    }

    const freightData = docSnap.data() as any;
    let bodyworkNames: string[] = [];
    let vehicleNames: string[] = [];

    if (freightData.requiredBodyworks?.length > 0) {
        const bodyworksQuery = query(collection(db, 'body_types'), where('__name__', 'in', freightData.requiredBodyworks));
        const bodyworksSnap = await getDocs(bodyworksQuery);
        bodyworkNames = bodyworksSnap.docs.map(d => d.data().name);
    }
    
    if(freightData.requiredVehicles?.length > 0) {
        vehicleNames = freightData.requiredVehicles.map((v: any) => v.name);
    }

    return { freight: freightData, bodyworkNames, vehicleNames };
}


export default async function AgregamentoFreightDetailsPage({ params }: AgregamentoDetailsPageProps) {
    const { freight, bodyworkNames, vehicleNames } = await getFreightData(params.freightId);

    if (!freight) {
        notFound();
    }

    return <AgregamentoDetailsClient initialFreight={freight} initialBodyworkNames={bodyworkNames} initialVehicleNames={vehicleNames} />;
}
