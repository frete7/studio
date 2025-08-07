
import UserDetailsClient from './user-details-client';

type UserDetailsPageProps = {
    params: {
        userId: string;
    }
}

export default function UserDetailsPage({ params: { userId } }: UserDetailsPageProps) {
    return <UserDetailsClient userId={userId} />;
}
