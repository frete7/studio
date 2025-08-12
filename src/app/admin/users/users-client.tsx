
'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, query, where, getDocs, limit, orderBy, startAfter } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { Eye, Loader2, UserCheck, ShieldAlert, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';

type User = {
    uid: string;
    name: string;
    email: string;
    role: 'driver' | 'company' | 'user' | 'admin';
    status?: 'active' | 'pending' | 'blocked' | 'suspended';
    createdAt: any;
};

const getInitials = (name: string) => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

const getStatusVariant = (status?: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
        case 'active': return 'default';
        case 'pending': return 'secondary';
        case 'blocked': return 'destructive';
        case 'suspended': return 'outline';
        default: return 'secondary';
    }
};

const getStatusLabel = (status?: string): string => {
    switch (status) {
        case 'active': return 'Ativo';
        case 'pending': return 'Pendente';
        case 'blocked': return 'Bloqueado';
        case 'suspended': return 'Suspenso';
        default: return 'Indefinido';
    }
}


export default function UsersClient({ initialData }: { initialData: User[] }) {
    const [users, setUsers] = useState<User[]>(initialData);
    const [isLoading, setIsLoading] = useState(false); // Start with false as initial data is present
    const [isFetching, setIsFetching] = useState(false); // State for fetching
    const [currentPage, setCurrentPage] = useState(1);
    const [usersPerPage] = useState(20); // Match this with the limit in page.tsx
    const [pageHistory, setPageHistory] = useState<any[]>([]); // To store last visible docs for back navigation
    const [lastVisible, setLastVisible] = useState<any>(null); // To store the last document snapshot
    const [hasNextPage, setHasNextPage] = useState(initialData.length === usersPerPage); // Assume next page exists if initial data is full

    const fetchUsersPage = useCallback(async (startAfterDoc?: any) => {
        try {
            let q = query(
                collection(db, 'users'),
                // You might need to create an index for 'createdAt'
                // https://firebase.google.com/docs/firestore/query-data/indexing
                // Replace 'createdAt' with a field suitable for stable ordering if needed
                orderBy('createdAt'), 
                limit(usersPerPage)
            );

            if (startAfterDoc) {
                q = query(q, startAfter(startAfterDoc));
            }

            const querySnapshot = await getDocs(q);
            const usersData: User[] = [];
            querySnapshot.forEach((doc) => {
                usersData.push({ ...doc.data(), uid: doc.id } as User);
            });

            // We only update users state here if the initial data wasn't enough or we are fetching a new page
            // For initial load, initialData is used.
            if (!startAfterDoc && initialData.length > 0) {
                setUsers(initialData);
            } else {
                setUsers(usersData);
            }
            if (querySnapshot.docs.length > 0) {
                setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
            }
            setHasNextPage(querySnapshot.docs.length === usersPerPage); // Assume more if we got a full page
            return usersData;

        } catch (error) {
            console.error("Error fetching users page:", error);
            return [];
        }
    }, [usersPerPage, initialData]);
    
    // Initial fetch (can be removed if initialData is always sufficient)
    useEffect(() => {
        fetchUsersPage();
    }, [fetchUsersPage]); // Dependency includes fetchUsersPage

    // NOTE: Filtering is now applied to the currently fetched page of users
    const drivers = users.filter(u => u.role === 'driver'); 
    const companies = users.filter(u => u.role === 'company'); 
    const pendingUsers = users.filter(u => u.status === 'pending');

    const renderUserTable = (userList: User[], emptyMessage: string) => {
        if (isFetching) { // Use isFetching for table loading indicator
            return (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            )
        }
        
        if (userList.length === 0) {
            return <p className="text-center text-muted-foreground py-8">{emptyMessage}</p>
        }

        return (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[80px]">Avatar</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Função</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {userList.map(user => (
                        <TableRow key={user.uid}>
                            <TableCell>
                                <Avatar>
                                    <AvatarImage src={`https://avatar.vercel.sh/${user.email}.png`} alt={user.name} />
                                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                                </Avatar>
                            </TableCell>
                            <TableCell className="font-medium">{user.name}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                                <Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'} className="capitalize">
                                    {user.role === 'driver' ? 'Motorista' : user.role === 'company' ? 'Empresa' : user.role}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <Badge variant={getStatusVariant(user.status)} className="capitalize">
                                    {getStatusLabel(user.status)}
                                </Badge>
                            </TableCell>
                             <TableCell className="text-right">
                                <Button asChild variant="ghost" size="icon">
                                    <Link href={`/admin/users/${user.uid}`}>
                                        <Eye className="h-4 w-4" />
                                        <span className="sr-only">Ver Detalhes</span>
                                    </Link>
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        );
    }

    const handleNextPage = async () => {
        if (lastVisible && !isFetching) {
            setIsFetching(true);
            // Store the current lastVisible before fetching the next page
            setPageHistory(prevHistory => [...prevHistory, lastVisible]);
            setCurrentPage(prev => prev + 1);
            const nextUsers = await fetchUsersPage(lastVisible);
            // The fetchUsersPage updates the users state internally
            setIsFetching(false);
        }
    }

    const handlePreviousPage = async () => {
        if (currentPage > 1 && !isFetching) {
            setIsFetching(true);
            // Get the last visible document of the previous page
            const prevLastVisible = pageHistory[pageHistory.length - 1];
            // Remove the last document from history as we are going back
            setPageHistory(prevHistory => prevHistory.slice(0, -1));
            setCurrentPage(prev => prev - 1);

            // Fetch the previous page. If going back to page 1, startAfter is undefined.
            const prevUsers = await fetchUsersPage(currentPage === 2 ? undefined : prevLastVisible);
            // The fetchUsersPage updates the users state internally

            // Need to manually set lastVisible for the *new* current page after going back
            // This is tricky with startAfter/endBefore. A simpler approach might store arrays of docs.
            // For this implementation, let's rely on fetchUsersPage setting lastVisible based on the fetched page.
        }
    }

    return (
        <Tabs defaultValue="pending">
            <TabsList className="grid w-full grid-cols-2 md:w-[600px] md:grid-cols-4">
                 <TabsTrigger value="pending">
                    <ShieldAlert className="mr-2 h-4 w-4" />
                    Pendentes
                    <Badge variant="secondary" className="ml-2">{pendingUsers.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="all">
                    <Users className="mr-2 h-4 w-4" />
                    Todos
                     <Badge variant="secondary" className="ml-2">{users.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="drivers">
                    Motoristas
                    <Badge variant="secondary" className="ml-2">{drivers.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="companies">
                    Empresas
                     <Badge variant="secondary" className="ml-2">{companies.length}</Badge>
                </TabsTrigger>
            </TabsList>
            <Card className="mt-4">
                 <CardContent className="p-0">
                    <TabsContent value="pending" className="m-0">
                        {renderUserTable(pendingUsers, "Nenhum usuário com cadastro pendente.")}
                    </TabsContent>
                    <TabsContent value="all" className="m-0">
                        {renderUserTable(users, "Nenhum usuário encontrado.")}
                    </TabsContent>
                    <TabsContent value="drivers" className="m-0">
                        {renderUserTable(drivers, "Nenhum motorista encontrado.")}
                    </TabsContent>
                    <TabsContent value="companies" className="m-0">
                        {renderUserTable(companies, "Nenhuma empresa encontrada.")}
                    </TabsContent>
                 </CardContent>
            </Card>
             <div className="flex justify-between items-center mt-4">\
                <Button onClick={handlePreviousPage} disabled={currentPage === 1 || isFetching} variant="outline">
                    {isFetching && currentPage > 1 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Anterior
                </Button>
                <div className="text-sm text-muted-foreground">Página {currentPage}</div>
                <Button onClick={handleNextPage} disabled={!hasNextPage || isFetching}>
                    {isFetching && hasNextPage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Próximo
                </Button>
            </div>\
        </Tabs>
    );
}
