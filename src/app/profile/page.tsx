
'use client';

import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import ProfileClient from './profile-client';
import { useAuth } from '@/hooks/use-auth';

export default function ProfilePage() {
    const router = useRouter();
    const { profile, isLoading, isAuthenticated } = useAuth();

    // Se não estiver autenticado, redirecionar para login
    if (!isLoading && !isAuthenticated) {
        router.push('/login');
        return null;
    }

    // Se estiver carregando, mostrar loading
    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Carregando perfil...</p>
                </div>
            </div>
        );
    }

    // Se não tiver perfil, mostrar erro
    if (!profile) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                    <p className="text-muted-foreground mb-4">Perfil não encontrado.</p>
                    <button 
                        onClick={() => router.push('/login')}
                        className="text-primary hover:underline"
                    >
                        Voltar para o login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="max-w-6xl mx-auto">
                <ProfileClient initialProfile={profile} />
            </div>
        </div>
    );
}
