
import type { Metadata } from 'next';
import CategoriesClient from './categories-client';

export const metadata: Metadata = {
    title: 'Gerenciamento de Categorias | Frete7 Admin',
    description: 'Gerencie as categorias de veículos da plataforma.',
};

export default function AdminCategoriesPage() {
    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-headline text-primary">Gerenciamento de Categorias de Veículos</h1>
                <p className="text-foreground/70">Adicione, edite ou remova as categorias de veículos disponíveis.</p>
            </div>
            <CategoriesClient />
        </div>
    );
}
