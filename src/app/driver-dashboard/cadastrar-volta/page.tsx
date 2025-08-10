
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CadastrarVoltaClient from './cadastrar-volta-client';
import { type VehicleType, type BodyType } from '@/app/actions';

export default function CadastrarVoltaPage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists()) {
                    setProfile(userDoc.data());
                    
                    try {
                        // Query only for the vehicles inside the user's subcollection
                        const vehiclesQuery = query(collection(db, 'users', currentUser.uid, 'vehicles'));
                        const vehiclesSnapshot = await getDocs(vehiclesQuery);

                        const vehicleDataPromises = vehiclesSnapshot.docs.map(async (vehicleDoc) => {
                            const vehicleData = vehicleDoc.data();
                            
                            // Fetch names for vehicleType and bodyType for each vehicle
                            const vehicleTypeRef = doc(db, 'vehicle_types', vehicleData.vehicleTypeId);
                            const bodyTypeRef = doc(db, 'body_types', vehicleData.bodyTypeId);

                            const [vehicleTypeSnap, bodyTypeSnap] = await Promise.all([
                                getDoc(vehicleTypeRef),
                                getDoc(bodyTypeRef)
                            ]);

                            return {
                                id: vehicleDoc.id,
                                ...vehicleData,
                                typeName: vehicleTypeSnap.exists() ? vehicleTypeSnap.data().name : 'N/A',
                                bodyworkName: bodyTypeSnap.exists() ? bodyTypeSnap.data().name : 'N/A',
                            };
                        });
                        
                        const userVehicles = await Promise.all(vehicleDataPromises);
                        setVehicles(userVehicles);

                    } catch (e) {
                         console.error("Error fetching vehicles and related data: ", e);
                         setVehicles([]);
                    }


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

    if (isLoading || !profile) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="max-w-3xl mx-auto">
                <div className="mb-8">
                     <Button asChild variant="outline" className="mb-4">
                        <Link href="/driver-dashboard">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Voltar para o Painel
                        </Link>
                    </Button>
                </div>
                 <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold font-headline text-primary">Cadastrar Volta</h1>
                    <p className="mt-2 text-lg text-foreground/70">
                        Anuncie suas viagens de retorno para encontrar novas cargas e otimizar seu faturamento.
                    </p>
                </div>
                <CadastrarVoltaClient
                    driverId={user!.uid}
                    profile={profile}
                    vehicles={vehicles}
                />
            </div>
        </div>
    );
}
