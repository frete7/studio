
'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    const pendingUsers = users.filter(u => u.status === 'pending');

    const renderUserTable = (userList: User[], emptyMessage: string) => {
        if (isLoading) {
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

    return (
        <Tabs defaultValue="pending">
            <TabsList className="grid w-full grid-cols-2 md:w-[600px] md:grid-cols-4">
                 <TabsTrigger value="pending">
                    <ShieldAlert className="mr-2 h-4 w-4" />
                    Pendentes
                    <Badge variant="secondary" className="ml-2">{isLoading ? '...' : pendingUsers.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="all">
                    <Users className="mr-2 h-4 w-4" />
                    Todos
                     <Badge variant="secondary" className="ml-2">{isLoading ? '...' : users.length}</Badge>
                </TabsTrigger>
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
        </Tabs>
    );
}
