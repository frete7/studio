'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type User = {
    uid: string;
    name: string;
    email: string;
    role: 'driver' | 'company' | 'user' | 'admin';
    createdAt: any;
};

const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

export default function UsersClient() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        const q = query(collection(db, 'users'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const usersData: User[] = [];
            querySnapshot.forEach((doc) => {
                usersData.push({ ...doc.data(), uid: doc.id } as User);
            });
            setUsers(usersData);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const drivers = users.filter(u => u.role === 'driver');
    const companies = users.filter(u => u.role === 'company');

    const renderUserTable = (userList: User[]) => {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            )
        }
        
        if (userList.length === 0) {
            return <p className="text-center text-muted-foreground py-8">Nenhum usuário encontrado nesta categoria.</p>
        }

        return (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[80px]">Avatar</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Função</TableHead>
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
                                    {user.role}
                                </Badge>
                            </TableCell>
                             <TableCell className="text-right">
                                {/* Action buttons will go here */}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        );
    }

    return (
        <Tabs defaultValue="drivers">
            <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
                <TabsTrigger value="drivers">
                    Motoristas
                    <Badge variant="secondary" className="ml-2">{isLoading ? '...' : drivers.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="companies">
                    Empresas
                     <Badge variant="secondary" className="ml-2">{isLoading ? '...' : companies.length}</Badge>
                </TabsTrigger>
            </TabsList>
            <Card className="mt-4">
                 <CardContent className="p-0">
                    <TabsContent value="drivers" className="m-0">
                        {renderUserTable(drivers)}
                    </TabsContent>
                    <TabsContent value="companies" className="m-0">
                        {renderUserTable(companies)}
                    </TabsContent>
                 </CardContent>
            </Card>
        </Tabs>
    );
}
