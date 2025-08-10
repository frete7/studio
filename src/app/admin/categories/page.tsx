
import type { Metadata } from 'next';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { type VehicleCategory } from '@/app/actions';
import CategoriesClient from './categories-client';

export const metadata: Metadata = {
    title: 'Gerenciamento de Categorias | Frete7 Admin',
    description: 'Gerencie as categorias de veículos da plataforma.',
};

async function getCategories(): Promise<VehicleCategory[]> {
    try {
        const q = query(collection(db, 'vehicle_categories'));
        const querySnapshot = await getDocs(q);
        const data: VehicleCategory[] = [];
        querySnapshot.forEach((doc) => {
            data.push({ ...doc.data(), id: doc.id } as VehicleCategory);
        });
        return data;
    } catch (error) {
        console.error("Error fetching categories server-side:", error);
        return [];
    }
}


export default async function AdminCategoriesPage() {
    const initialCategories = await getCategories();

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-headline text-primary">Gerenciamento de Categorias de Veículos</h1>
                <p className="text-foreground/70">Adicione, edite ou remova as categorias de veículos disponíveis.</p>
            </div>
            <CategoriesClient initialCategories={initialCategories} />
        </div>
    );
}
