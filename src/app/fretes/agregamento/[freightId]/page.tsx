
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';

import { type Freight, type Collaborator } from '@/app/actions';
import { Loader2, ArrowLeft, User, Mail, Phone, MapPin, Package, AlertCircle, Truck, DollarSign, Lock, Building, MessageSquare, RouteIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type AggregationFreightDetails = Freight & {
  responsibleCollaborators: string[];
  requiredVehicles: { id: string; name: string; priceTable?: { kmStart: number; kmEnd: number; price: number }[] }[];
  requiredBodyworks: string[];
  orderDetails: any;
  isPriceToCombine: boolean;
};

type EnrichedCollaborator = Collaborator & {
  name: string;
  phone: string;
};

export default function AgregamentoFreightDetailsPage() {
    const [freight, setFreight] = useState<AggregationFreightDetails | null>(null);
    const [collaborators, setCollaborators] = useState<EnrichedCollaborator[]>([]);
    const [bodyworkNames, setBodyworkNames] = useState<string[]>([]);
    const [vehicleNames, setVehicleNames] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const { freightId } = useParams();
    const router = useRouter();

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setIsAuthLoading(false);
        });
        
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!freightId || typeof freightId !== 'string') {
            setError("ID do frete inválido.");
            setIsLoading(false);
            return;
        }

        const fetchFreightData = async () => {
            setIsLoading(true);
            try {
                const docRef = doc(db, 'freights', freightId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const freightData = docSnap.data() as AggregationFreightDetails;
                    setFreight(freightData);

                    // Fetch Collaborators
                    if (freightData.companyId && freightData.responsibleCollaborators?.length > 0) {
                        const collsQuery = query(
                            collection(db, `users/${freightData.companyId}/collaborators`),
                            where('__name__', 'in', freightData.responsibleCollaborators)
                        );
                        const collsSnap = await getDocs(collsQuery);
                        const collsData = collsSnap.docs.map(d => d.data() as EnrichedCollaborator);
                        setCollaborators(collsData);
                    }

                    // Fetch Bodywork Names
                    if (freightData.requiredBodyworks?.length > 0) {
                        const bodyworksQuery = query(collection(db, 'body_types'), where('__name__', 'in', freightData.requiredBodyworks));
                        const bodyworksSnap = await getDocs(bodyworksQuery);
                        const names = bodyworksSnap.docs.map(d => d.data().name);
                        setBodyworkNames(names);
                    }
                    
                    // Vehicle names are already in the requiredVehicles array
                    if(freightData.requiredVehicles?.length > 0) {
                        setVehicleNames(freightData.requiredVehicles.map(v => v.name));
                    }

                } else {
                    setError("Frete não encontrado.");
                }
            } catch (err) {
                console.error(err);
                setError("Ocorreu um erro ao buscar os detalhes do frete.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchFreightData();
    }, [freightId]);

    const formatCurrency = (value: number) => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    if (isLoading || isAuthLoading) {
        return (
            <div className="flex h-[calc(100vh-12rem)] items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (error) {
        return (
             <div className="container mx-auto px-4 py-12 text-center">
                 <Card className="max-w-md mx-auto">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-center gap-2 text-destructive">
                            <AlertCircle className="h-6 w-6" />
                            Erro
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">{error}</p>
                        <Button onClick={() => router.back()} className="mt-6">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Voltar
                        </Button>
                    </CardContent>
                 </Card>
            </div>
        )
    }

    if (!freight) return null;

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="max-w-4xl mx-auto space-y-8">
                <div>
                    <Button onClick={() => router.back()} variant="outline" className="mb-4">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar para a lista
                    </Button>
                     <div className="flex flex-wrap items-center justify-between gap-4">
                        <h1 className="text-3xl font-bold font-headline text-primary">
                            Detalhes do Agregamento
                        </h1>
                         <Badge variant="outline" className="text-base font-semibold border-primary/50 text-primary uppercase">
                            Agregamento
                        </Badge>
                    </div>
                     <p className="text-muted-foreground">Código: {freight.id}</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <RouteIcon className="h-5 w-5" />
                            Rota
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h4 className="font-semibold text-md">Origem</h4>
                            <p className="text-muted-foreground">{freight.origin.city}, {freight.origin.state}</p>
                        </div>
                        <Separator />
                        <div>
                            <h4 className="font-semibold text-md">Destinos</h4>
                            <ul className="list-disc list-inside text-muted-foreground">
                                {freight.destinations.map((d, i) => (
                                    <li key={i}>{d.city}, {d.state}</li>
                                ))}
                            </ul>
                        </div>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <Package className="h-5 w-5" />
                           Detalhes da Operação
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <p><strong className="text-foreground">Carga:</strong> {freight.orderDetails?.whatWillBeLoaded}</p>
                        <p><strong className="text-foreground">Tipo de Carga:</strong> {freight.orderDetails?.cargoType}</p>
                        <p><strong className="text-foreground">Pedágio:</strong> Pago pela {freight.orderDetails?.whoPaysToll}</p>
                        <p><strong className="text-foreground">Carga Perigosa:</strong> {freight.orderDetails?.isDangerousCargo ? 'Sim' : 'Não'}</p>
                        <p><strong className="text-foreground">Rastreador:</strong> {freight.orderDetails?.needsTracker ? `Sim (${freight.orderDetails.trackerType})` : 'Não'}</p>
                        <p><strong className="text-foreground">Ajuda do Motorista:</strong> {freight.orderDetails?.driverNeedsToHelp ? 'Sim' : 'Não'}</p>
                        <p><strong className="text-foreground">Ajudante:</strong> {freight.orderDetails?.needsHelper ? `Sim (Pago por: ${freight.orderDetails.whoPaysHelper})` : 'Não'}</p>
                         <p><strong className="text-foreground">Necessita ANTT:</strong> {freight.orderDetails?.driverNeedsANTT ? 'Sim' : 'Não'}</p>
                    </CardContent>
                </Card>

                <Card>
                     <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <Truck className="h-5 w-5" />
                           Veículos e Carrocerias
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h4 className="font-semibold text-md">Carrocerias Aceitas</h4>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {bodyworkNames.map(name => <Badge key={name} variant="secondary">{name}</Badge>)}
                            </div>
                        </div>
                        <Separator/>
                         <div>
                            <h4 className="font-semibold text-md">Tipos de Veículo Aceitos</h4>
                             <div className="flex flex-wrap gap-2 mt-2">
                                {vehicleNames.map(name => <Badge key={name} variant="secondary">{name}</Badge>)}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <DollarSign className="h-5 w-5" />
                           Tabela de Preços
                        </CardTitle>
                    </CardHeader>
                     <CardContent>
                        {freight.isPriceToCombine ? (
                             <p className="text-center text-lg font-semibold text-muted-foreground">Valor a combinar diretamente com a empresa.</p>
                        ) : (
                            <div className="space-y-6">
                                {freight.requiredVehicles.map(vehicle => (
                                    <div key={vehicle.id}>
                                        <h4 className="font-semibold text-md mb-2">{vehicle.name}</h4>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>De (km)</TableHead>
                                                    <TableHead>Até (km)</TableHead>
                                                    <TableHead className="text-right">Valor</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {vehicle.priceTable?.map((row, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell>{row.kmStart}</TableCell>
                                                        <TableCell>{row.kmEnd}</TableCell>
                                                        <TableCell className="text-right font-medium">{formatCurrency(row.price)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building className="h-5 w-5" />
                            Contato da Empresa
                        </CardTitle>
                        <CardDescription>Entre em contato com o responsável pela vaga.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {user ? (
                            collaborators.length > 0 ? (
                                collaborators.map(c => (
                                    <div key={c.id} className="p-3 border rounded-md bg-muted/30">
                                         <div className="flex items-center gap-3 mb-2">
                                            <User className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-semibold">{c.name}</span>
                                        </div>
                                         <div className="flex items-center gap-3">
                                            <Phone className="h-4 w-4 text-muted-foreground" />
                                            <span>{c.phone}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-muted-foreground">Informações de contato não disponíveis.</p>
                            )
                        ) : (
                            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md text-center text-sm text-yellow-800 flex items-center justify-center gap-2">
                                <Lock className="h-4 w-4" />
                                <span>
                                    <Link href="/login" className="font-semibold underline">Faça login</Link> ou <Link href="/register" className="font-semibold underline">cadastre-se</Link> para ver o contato.
                                </span>
                            </div>
                        )}
                        <Button className="w-full mt-4">
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Tenho Interesse
                        </Button>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}

