
import { doc, getDoc, getCountFromServer, query, collection, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notFound } from 'next/navigation';
import { getPlans, type Plan } from '@/app/actions';
import UserDetailsClient from './user-details-client';


type UserDetailsPageProps = {
    params: {
        userId: string;
    }
}

export default async function UserDetailsPage({ params }: UserDetailsPageProps) {
    const userId = params.userId;

    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
        notFound();
    }

    const user = userDoc.data();

    // Fetch plans based on user role
    const plans = await getPlans();
    const filteredPlans = plans.filter(plan => plan.userType === user.role);

    // Fetch company stats if user is a company
    let companyStats = null;
    if (user.role === 'company') {
        try {
            const freightsCollection = collection(db, 'freights');
            
            const activeQuery = query(freightsCollection, where('companyId', '==', userId), where('status', '==', 'active'));
            const activeSnapshot = await getCountFromServer(activeQuery);
            
            const requestedQuery = query(freightsCollection, where('companyId', '==', userId), where('status', '==', 'requested'));
            const requestedSnapshot = await getCountFromServer(requestedQuery);
            
            const completedQuery = query(freightsCollection, where('companyId', '==', userId), where('status', '==', 'completed'));
            const completedSnapshot = await getCountFromServer(completedQuery);

            companyStats = {
                activeFreights: activeSnapshot.data().count,
                requestedFreights: requestedSnapshot.data().count,
                completedFreights: completedSnapshot.data().count,
            };
        } catch (error) {
            console.error("Error fetching company stats server-side:", error);
        }
    }


    return <UserDetailsClient 
        userId={userId} 
        initialUser={user as any} 
        initialPlans={filteredPlans}
        initialCompanyStats={companyStats}
    />;
}
