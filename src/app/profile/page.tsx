
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ProfileClient from './profile-client';
import { getAuth } from 'firebase-auth/next-server';
import { type NextRequest } from 'next/server';

// Helper function to get user session from cookies
async function getUserSession(req: NextRequest) {
  const cookieStore = cookies();
  const session = cookieStore.get('firebase-session')?.value;
  if (!session) return null;

  try {
    // This is a simplified way to "verify" a session on the server.
    // In a real production app, you'd use a more robust method like the Firebase Admin SDK.
    // For this environment, we'll assume the client-set cookie is valid for fetching initial data.
    // The actual security is still enforced by Firestore rules.
    const user = JSON.parse(Buffer.from(session, 'base64').toString());
    return user;
  } catch (error) {
    return null;
  }
}

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
        // ... any other timestamp fields
        return profile;
    }
    return null;
}

export default async function ProfilePage({ request }: { request: NextRequest }) {
    const user = auth.currentUser;

    if (!user) {
        return redirect('/login');
    }

    const initialProfile = await getProfileData(user.uid);
    
    if (!initialProfile) {
       return redirect('/login');
    }

    return (
       <div className="container mx-auto px-4 py-12">
            <div className="max-w-6xl mx-auto">
                 <ProfileClient initialProfile={initialProfile as any} />
            </div>
        </div>
    );
}
