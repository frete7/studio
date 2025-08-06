
import type { Metadata } from 'next';
import BodyTypesClient from './body-types-client';

export const metadata: Metadata = {
    title: 'Gerenciamento de Carrocerias | Frete7 Admin',
    description: 'Gerencie os tipos de carrocerias da plataforma.',
};

export default function AdminBodyTypesPage() {
    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-headline text-primary">Gerenciamento de Tipos de Carrocerias</h1>
                <p className="text-foreground/70">Adicione, edite ou remova os tipos de carrocerias disponíveis.</p>
            </div>
            <BodyTypesClient />
        </div>
    );
}
