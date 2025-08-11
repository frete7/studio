
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { onSnapshot, doc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

import { Loader2 } from "lucide-react";
import CompanyProfileForm from './company-profile-form';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import DriverProfileForm from './driver-profile-form';


type UserProfile = {
    uid: string;
    name: string;
    email: string;
    role: 'driver' | 'company' | 'admin';
    status: 'incomplete' | 'pending' | 'active' | 'blocked' | 'suspended';
    [key: string]: any;
}


export default function ProfileClient({ initialProfile }: { initialProfile: UserProfile }) {
    const [profile, setProfile] = useState<UserProfile>(initialProfile);
    const [isLoading, setIsLoading] = useState(false); // No initial loading needed as we have initialProfile
    const router = useRouter();


    useEffect(() => {
        if (!profile?.uid) return;
        
        const userDocRef = doc(db, 'users', profile.uid);
        const unsubscribeSnapshot = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
                const updatedProfile = { ...doc.data(), uid: doc.id } as UserProfile;
                 if (updatedProfile.createdAt?.toDate) {
                    updatedProfile.createdAt = updatedProfile.createdAt.toDate().toISOString();
                }
                if (updatedProfile.birthDate?.toDate) {
                    updatedProfile.birthDate = updatedProfile.birthDate.toDate().toISOString();
                }
                setProfile(updatedProfile);
            } else {
                router.push('/login'); 
            }
        });

        return () => unsubscribeSnapshot();
    }, [profile?.uid, router]);


    const renderContent = () => {
        if (isLoading) {
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
            return <DriverProfileForm profile={profile} />;
        }

        return <p>Página de perfil para {profile.role}.</p>
    }


  return (
    <>
       {renderContent()}
    </>
  );
}
