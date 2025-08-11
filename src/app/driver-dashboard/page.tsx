
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

import { Loader2 } from "lucide-react";
import DashboardClient from './dashboard-client';


type UserProfile = {
    uid: string;
    name: string;
    email: string;
    role: 'driver' | 'company' | 'admin';
    status: 'incomplete' | 'pending' | 'active' | 'blocked' | 'suspended';
    [key: string]: any;
}


export default function DriverDashboardPage() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();


    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const userDocRef = doc(db, 'users', currentUser.uid);
                const docSnap = await getDoc(userDocRef);

                if (docSnap.exists()) {
                    const userProfile = { ...docSnap.data(), uid: docSnap.id } as UserProfile;
                    setProfile(userProfile);

                    if (userProfile.role !== 'driver') {
                        router.push('/company-dashboard'); // Or a generic home
                        return;
                    }
                } else {
                    router.push('/login'); 
                }
                setIsLoading(false);
            } else {
                router.push('/login');
                setIsLoading(false);
            }
        });

        return () => unsubscribeAuth();

    }, [router]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
  
    if (!profile) {
        return null;
    }

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="max-w-6xl mx-auto">
                <DashboardClient initialProfile={profile} />
            </div>
        </div>
    );
}
