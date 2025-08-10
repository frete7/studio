

import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from "lucide-react";
import CompanyProfileForm from './company-profile-form';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// This component can't be fully server-rendered because Firebase Auth state
// is primarily managed on the client. We will make the page itself a client component
// to handle the auth logic.
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { onSnapshot } from 'firebase/firestore';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';


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
                        const userProfile = { ...doc.data(), uid: doc.id } as UserProfile;
                        setProfile(userProfile);
                    } else {
                        router.push('/login'); 
                    }
                    setIsLoading(false);
                });

                return () => unsubscribeSnapshot();
            } else {
                router.push('/login');
                setIsLoading(false);
            }
        });

        return () => unsubscribeAuth();

    }, [router]);


    const renderContent = () => {
        if (isLoading || !profile) {
            return (
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            );
        }
        
        if (profile.role === 'admin') {
            return (
                 <Card>
                    <CardHeader>
                        <CardTitle>Painel do Administrador</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>Você está logado como administrador.</p>
                        <Button asChild className="mt-4">
                            <Link href="/admin">Ir para o Painel de Admin</Link>
                        </Button>
                    </CardContent>
                </Card>
            )
        }

        if (profile.role === 'company') {
             return <CompanyProfileForm profile={profile} />;
        }
        
        if (profile.role === 'driver') {
            return <p>Página de perfil para motorista (em construção).</p>
        }

        return <p>Página de perfil para {profile.role}.</p>
    }


  return (
    <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
            {renderContent()}
        </div>
    </div>
  );
}
