import type { Metadata } from 'next';
import UsersClient from './users-client';

export const metadata: Metadata = {
    title: 'Gerenciamento de Usuários | Frete7 Admin',
    description: 'Visualize e gerencie os usuários da plataforma.',
};

export default function AdminUsersPage() {
    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold font-headline text-primary">Gerenciamento de Usuários</h1>
                <p className="text-foreground/70">Visualize e gerencie todos os motoristas e empresas cadastrados.</p>
            </div>
            <UsersClient />
        </div>
    );
}
