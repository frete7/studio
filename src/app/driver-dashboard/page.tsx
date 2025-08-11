
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { User, Clock, ShieldCheck, Loader2, Edit, Search, ArrowRight, FileText, Gift, MessageSquareWarning, LifeBuoy, ClipboardList, Map } from "lucide-react";
import { Button } from '@/components/ui/button';
import Link from 'next/link';
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

                        if (userProfile.role !== 'driver') {
                            router.push('/company-dashboard'); // Or a generic home
                            return;
                        }

                    } else {
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

    if (isLoading || !profile) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
  
    return (
        <div className="container mx-auto px-4 py-12">
            <div className="max-w-6xl mx-auto">
                <DashboardClient initialProfile={profile} />
            </div>
        </div>
    );
}
