
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import ProfileClient from './profile-client';
import { Loader2 } from 'lucide-react';

async function getProfileData(userId: string) {
    if (!userId) {
        return null;
    }
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        const profile = { uid: userDoc.id, ...userDoc.data() };
        // Serialize any non-serializable fields if necessary, e.g., Timestamps
        if (profile.createdAt?.toDate) {
            profile.createdAt = profile.createdAt.toDate().toISOString();
        }
        if (profile.birthDate?.toDate) {
            profile.birthDate = profile.birthDate.toDate().toISOString();
        }
        return profile;
    }
    return null;
}

export default function ProfilePage() {
    const [isLoading, setIsLoading] = useState(true);
    const [initialProfile, setInitialProfile] = useState<any | null>(null);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const profileData = await getProfileData(user.uid);
                if (profileData) {
                    setInitialProfile(profileData);
                } else {
                    router.push('/login');
                }
            } else {
                router.push('/login');
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [router]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!initialProfile) {
        return null; // Or a redirect component
    }

    return (
       <div className="container mx-auto px-4 py-12">
            <div className="max-w-6xl mx-auto">
                 <ProfileClient initialProfile={initialProfile} />
            </div>
        </div>
    );
}
