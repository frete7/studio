
import { getPlans, type Plan } from '@/app/actions';
import { auth } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import BillingClient from './billing-client';
import { redirect } from 'next/navigation';

type UserProfile = {
    activePlanId?: string;
    activePlanName?: string;
    [key: string]: any;
}

async function getBillingData() {
    const firebaseUser = auth.currentUser;
    // This check is more for type safety on the server, 
    // real auth should be handled by middleware or page-level checks.
    if (!firebaseUser) {
        return { allPlans: [], profile: null };
    }

    try {
        const plansData = await getPlans();
        const companyPlans = plansData.filter(p => p.userType === 'company');

        const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (!profileDoc.exists()) {
            return { allPlans: companyPlans, profile: null };
        }
        
        const profile = profileDoc.data() as UserProfile;

        return { allPlans: companyPlans, profile };

    } catch (error) {
        console.error("Failed to fetch billing data on server:", error);
        return { allPlans: [], profile: null };
    }
}


export default async function BillingPage() {
    // This is now a server component, so we fetch data here.
    // Note: In a real app, you'd get the user from a server-side session (e.g., NextAuth.js)
    // As we rely on client-side auth, this page might have stale data if user changes.
    // A better approach would be a hybrid, but for speed, we'll fetch on server.
    // For now, this will only work if the server has an authenticated user context, which it might not.
    // So we convert it to a client component that fetches data.
    return (
       <BillingClientLoader />
    );
}

// We create a new loader client component to handle the client-side data fetching, 
// keeping the page itself clean.
function BillingClientLoader() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                try {
                    const [plansData, profileDoc] = await Promise.all([
                        getPlans(),
                        getDoc(doc(db, 'users', currentUser.uid))
                    ]);
                    
                    if (profileDoc.exists()) {
                        setProfile(profileDoc.data() as UserProfile);
                    } else {
                         router.push('/login');
                         return;
                    }
                    setPlans(plansData.filter(p => p.userType === 'company'));
                } catch (error) {
                     console.error("Failed to fetch billing data", error);
                } finally {
                    setIsLoading(false);
                }
            } else {
                router.push('/login');
            }
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
    
    if (!profile) return null;
    
    return (
         <div className="container mx-auto px-4 py-12">
            <div className="max-w-6xl mx-auto">
                 <div className="mb-8">
                     <Button asChild variant="outline" className="mb-4">
                        <Link href="/company-dashboard">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Voltar para o Painel
                        </Link>
                    </Button>
                </div>
                <BillingClient 
                    allPlans={plans} 
                    currentPlanId={profile.activePlanId}
                />
            </div>
        </div>
    )

}
