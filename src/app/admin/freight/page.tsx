
import type { Metadata } from 'next';
import FreightsClient from './freights-client';

export const metadata: Metadata = {
    title: 'Gerenciamento de Fretes | Frete7 Admin',
    description: 'Monitore e gerencie todos os fretes anunciados na plataforma.',
};

export default function AdminFreightPage() {
  return (
    <div>
        <div className="mb-8">
            <h1 className="text-3xl font-bold font-headline text-primary">Gerenciamento de Fretes</h1>
            <p className="text-foreground/70">Monitore e gerencie todos os fretes anunciados.</p>
        </div>
        <FreightsClient />
    </div>
  );
}
