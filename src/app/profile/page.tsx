
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { User, Clock, ShieldCheck, Loader2 } from "lucide-react";
import CompanyProfileForm from './company-profile-form';


type UserProfile = {
    uid: string;
    name: string;
    email: string;
    role: 'driver' | 'company' | 'admin';
    status: 'incomplete' | 'pending' | 'active' | 'blocked' | 'suspended';
    [key: string]: any;
}


export default function ProfilePage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();


    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const userDocRef = doc(db, 'users', currentUser.uid);
                
                const unsubscribeSnapshot = onSnapshot(userDocRef, (doc) => {
                    if (doc.exists()) {
                        setProfile(doc.data() as UserProfile);
                    } else {
                        // Handle case where user exists in Auth but not Firestore
                        router.push('/login'); 
                    }
                    setIsLoading(false);
                });

                return () => unsubscribeSnapshot();
            } else {
                router.push('/login');
            }
        });

        return () => unsubscribeAuth();

    }, [router]);


    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            );
        }

        if (!profile) {
            return <p>Perfil não encontrado.</p>;
        }

        switch (profile.status) {
            case 'incomplete':
                return <CompanyProfileForm profile={profile} />;
            case 'pending':
                return (
                    <Card>
                        <CardHeader className="items-center text-center">
                             <Clock className="h-12 w-12 text-yellow-500 mb-4" />
                            <CardTitle className="text-2xl">Aguardando Verificação</CardTitle>
                            <CardDescription className="max-w-md">
                                Seus dados foram recebidos com sucesso! Nossa equipe está analisando suas informações e documentos.
                                Você será notificado por e-mail assim que a verificação for concluída.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                );
            case 'active':
                 return (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-green-500" />
                                Perfil Ativo
                            </CardTitle>
                            <CardDescription>
                                Seu perfil está verificado e ativo na plataforma.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                             <p>Em breve: Visualização completa do perfil.</p>
                        </CardContent>
                    </Card>
                );
            default:
                return (
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5 text-primary" />
                                Meu Perfil
                            </CardTitle>
                            <CardDescription>
                                Mantenha suas informações sempre atualizadas. Status: {profile.status}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p>Conteúdo do perfil para status: {profile.status}</p>
                        </CardContent>
                    </Card>
                )
        }
    }


  return (
    <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
            {renderContent()}
        </div>
    </div>
  );
}
