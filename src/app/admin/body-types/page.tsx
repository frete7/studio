
import type { Metadata } from 'next';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { type BodyType } from '@/app/actions';
import BodyTypesClient from './body-types-client';

export const metadata: Metadata = {
    title: 'Gerenciamento de Carrocerias | Frete7 Admin',
    description: 'Gerencie os tipos de carrocerias da plataforma.',
};

async function getBodyTypes(): Promise<BodyType[]> {
    try {
        const bodyTypesCollection = collection(db, 'body_types');
        const snapshot = await getDocs(bodyTypesCollection);
        return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as BodyType));
    } catch (error) {
        console.error("Error fetching body types server-side:", error);
        return [];
    }
}


export default async function AdminBodyTypesPage() {
    const initialBodyTypes = await getBodyTypes();

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-headline text-primary">Gerenciamento de Tipos de Carrocerias</h1>
                <p className="text-foreground/70">Adicione, edite ou remova os tipos de carrocerias disponíveis.</p>
            </div>
            <BodyTypesClient initialData={initialBodyTypes} />
        </div>
    );
}
