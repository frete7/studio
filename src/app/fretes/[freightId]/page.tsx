

import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notFound } from 'next/navigation';
import FreightDetailsClient from './freight-details-client';
import { type Freight } from '@/app/actions';
import { getAuth } from 'firebase-admin/auth';
import { getFirebaseAdminApp } from '@/lib/firebase-admin';


type FreightDetailsPageProps = {
    params: {
        freightId: string;
    }
}

async function getFreight(id: string) {
    if (!id) return null;
    const docRef = doc(db, 'freights', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    
    const data = docSnap.data();
     // Firestore Timestamps are not serializable, so we convert them
    Object.keys(data).forEach(key => {
        if (data[key]?.toDate) {
            data[key] = data[key].toDate().toISOString();
        }
    });
    
    return { ...data, id: docSnap.id } as Freight;
}

export default async function FreightDetailsPage({ params }: FreightDetailsPageProps) {
    const freight = await getFreight(params.freightId);

    if (!freight) {
        notFound();
    }

    return <FreightDetailsClient initialFreight={freight} />;
}
