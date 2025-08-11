
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Edit, Trash2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getReturnTripsByDriver, deleteReturnTrip, type ReturnTrip } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';

export default function MyReturnsPage() {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [returnTrips, setReturnTrips] = useState<ReturnTrip[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                try {
                    const trips = await getReturnTripsByDriver(currentUser.uid);
                    setReturnTrips(trips);
                } catch (error) {
                    toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível carregar suas viagens de retorno.' });
                }
            } else {
                router.push('/login');
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [router, toast]);

    const handleDelete = async (tripId: string) => {
        try {
            await deleteReturnTrip(tripId);
            setReturnTrips(prev => prev.filter(trip => trip.id !== tripId));
            toast({ title: 'Sucesso!', description: 'Viagem de retorno removida.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível remover a viagem.' });
        }
    };
    
    const getDestinationString = (destination: ReturnTrip['destination']) => {
        switch(destination.type) {
            case 'brasil': return 'Brasil Todo';
            case 'estado': return `Estado: ${destination.state}`;
            case 'cidade': return `${destination.city}, ${destination.state}`;
            default: return 'Não especificado';
        }
    }

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="container mx-auto px-4 py-12">
            <div className="max-w-4xl mx-auto">
                 <div className="mb-8">
                     <Button asChild variant="outline" className="mb-4">
                        <Link href="/driver-dashboard">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Voltar para o Painel
                        </Link>
                    </Button>
                     <h1 className="text-3xl font-bold font-headline text-primary">Minhas Voltas Cadastradas</h1>
                    <p className="text-foreground/70">Gerencie todos os anúncios de viagem de retorno que você publicou.</p>
                </div>
                
                {returnTrips.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground mb-4">Você ainda não cadastrou nenhuma volta.</p>
                        <Button asChild>
                            <Link href="/driver-dashboard/cadastrar-volta">Cadastrar Primeira Volta</Link>
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {returnTrips.map(trip => (
                            <Card key={trip.id}>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                <MapPin className="h-5 w-5 text-primary" />
                                                <span>{trip.origin.city}, {trip.origin.state} &rarr; {getDestinationString(trip.destination)}</span>
                                            </CardTitle>
                                             <CardDescription>
                                                Partida em {trip.departureDate ? format(new Date(trip.departureDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'Data não informada'}
                                            </CardDescription>
                                        </div>
                                        <Badge variant={trip.status === 'active' ? 'default' : 'secondary'}>
                                            {trip.status === 'active' ? 'Ativo' : 'Inativo'}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                     <div className="grid md:grid-cols-2 gap-4 text-sm">
                                        <p><strong>Veículo:</strong> {trip.vehicle || 'Não informado'}</p>
                                        <p><strong>Disponibilidade:</strong> <span className="capitalize">{trip.availability}</span></p>
                                        <p><strong>Possui CNPJ?</strong> {trip.hasCnpj ? 'Sim' : 'Não'}</p>
                                        <p><strong>Emite NF?</strong> {trip.issuesInvoice ? 'Sim' : 'Não'}</p>
                                    </div>
                                    {trip.notes && (
                                        <div className="text-sm p-3 bg-muted/50 rounded-md">
                                            <p><strong>Observações:</strong> {trip.notes}</p>
                                        </div>
                                    )}
                                     <div className="flex justify-end gap-2 pt-4 border-t">
                                        <Button variant="outline" size="sm" disabled>
                                            <Edit className="mr-2 h-4 w-4"/>
                                            Editar
                                        </Button>
                                         <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" size="sm">
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Excluir
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Tem certeza que deseja excluir esta viagem de retorno? Esta ação não pode ser desfeita.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(trip.id)}>
                                                        Sim, excluir
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

