
import UserDetailsClient from './user-details-client';

type UserDetailsPageProps = {
    params: {
        userId: string;
    }
}

export default function UserDetailsPage({ params }: UserDetailsPageProps) {
    const { userId } = params;
    
    return <UserDetailsClient userId={userId} />;
}
