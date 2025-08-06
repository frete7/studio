
import type { Metadata } from 'next';
import FretesClient from './fretes-client';

export const metadata: Metadata = {
    title: 'Buscar Fretes | Frete7',
    description: 'Encontre as melhores oportunidades de frete em todo o Brasil.',
};

export default function FretesPage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <FretesClient />
        </div>
    );
}

