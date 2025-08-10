'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { type Freight } from '@/app/actions';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, PackageCheck, PackageSearch, Ban, MapPin, ArrowRight } from 'lucide-react';
import { cva } from 'class-variance-authority';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const freightTypeVariants = cva(
  "",
  {
    variants: {
      freightType: {
        comum: "border-transparent bg-sky-500 text-white hover:bg-sky-600",
        agregamento: "border-transparent bg-blue-500 text-white hover:bg-blue-600",
        "frete-completo": "border-transparent bg-green-500 text-white hover:bg-green-600",
        "frete-retorno": "border-transparent bg-orange-500 text-white hover:bg-orange-600",
      },
    },
    defaultVariants: {
      freightType: "comum",
    },
  }
)

const freightStatusVariants = cva(
    "",
    {
        variants: {
            status: {
                ativo: 'bg-green-100 text-green-800 border-green-200',
                concluido: 'bg-blue-100 text-blue-800 border-blue-200',
                pendente: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                cancelado: 'bg-red-100 text-red-800 border-red-200',
            }
        },
        defaultVariants: {
            status: 'pendente'
        }
    }
)

const getFreightTypeLabel = (type: Freight['freightType']): string => {
    const labels = {
        'comum': 'Comum',
        'agregamento': 'Agregamento',
        'frete-completo': 'Completo',
        'frete-retorno': 'Retorno',
    };
    return labels[type] || 'N/A';
}

const getStatusLabel = (status: Freight['status']): string => {
    const labels = {
        ativo: 'Ativo',
        concluido: 'Concluído',
        pendente: 'Pendente',
        cancelado: 'Cancelado',
    };
    return labels[status] || 'N/A';
}


export default function FreightsClient({ initialFreights }: { initialFreights: Freight[] }) {
    const [freights, setFreights] = useState<Freight[]>(initialFreights);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const q = query(collection(db, 'freights'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const data: Freight[] = [];
            querySnapshot.forEach((doc) => {
                const freightData = doc.data() as any;
                 // Ensure destinations is always an array
                if (!Array.isArray(freightData.destinations)) {
                    freightData.destinations = [];
                }
                const createdAt = freightData.createdAt?.toDate ? freightData.createdAt.toDate().toISOString() : null;
                data.push({ ...freightData, id: doc.id, createdAt });
            });
            setFreights(data);
        });

        return () => unsubscribe();
    }, []);

    const handleRowClick = (freightId: string) => {
        // router.push(`/admin/freight/${freightId}`);
        console.log(`Navigate to details for freight ${freightId}`);
    };

    const renderFreightTable = (freightList: Freight[], emptyMessage: string) => {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            )
        }
        
        if (freightList.length === 0) {
            return <p className="text-center text-muted-foreground py-8">{emptyMessage}</p>
        }

        return (
             <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Rota</TableHead>
                            <TableHead className="hidden md:table-cell">Solicitante</TableHead>
                            <TableHead className="hidden sm:table-cell">Data</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {freightList.map(freight => (
                            <TableRow key={freight.id} onClick={() => handleRowClick(freight.id)} className="cursor-pointer align-top">
                                <TableCell className="pt-5">
                                    <Badge className={freightTypeVariants({ freightType: freight.freightType })}>
                                        {getFreightTypeLabel(freight.freightType)}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 font-medium">
                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                        <span>{freight.origin.city}, {freight.origin.state}</span>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                        <span>
                                            {freight.destinations[0]?.city}, {freight.destinations[0]?.state}
                                            {freight.destinations[0]?.stops && <Badge variant="secondary" className="ml-2">+{freight.destinations[0].stops}</Badge>}
                                        </span>
                                    </div>
                                    {freight.destinations.length > 1 && (
                                        <Accordion type="single" collapsible className="w-full">
                                            <AccordionItem value={freight.id} className="border-b-0">
                                                <AccordionTrigger className="text-xs text-primary hover:no-underline py-1">
                                                    e mais {freight.destinations.length - 1} destino(s)
                                                </AccordionTrigger>
                                                <AccordionContent>
                                                    <ul className="pl-6 space-y-1">
                                                        {freight.destinations.slice(1).map((dest, index) => (
                                                            <li key={index} className="text-muted-foreground text-sm flex items-center gap-2">
                                                                <ArrowRight className="h-3 w-3" /> 
                                                                {dest.city}, {dest.state}
                                                                {dest.stops && <Badge variant="secondary" className="ml-1">+{dest.stops}</Badge>}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </AccordionContent>
                                            </AccordionItem>
                                        </Accordion>
                                    )}
                                </TableCell>
                                <TableCell className="hidden md:table-cell pt-5">{freight.companyName || 'N/A'}</TableCell>
                                 <TableCell className="hidden sm:table-cell pt-5">
                                    {freight.createdAt ? new Date(freight.createdAt).toLocaleDateString('pt-BR') : 'N/A'}
                                </TableCell>
                                <TableCell className="text-right pt-5">
                                    <Badge variant="outline" className={freightStatusVariants({status: freight.status})}>
                                        {getStatusLabel(freight.status)}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        );
    }
    
    const activeFreights = freights.filter(f => f.status === 'ativo');
    const pendingFreights = freights.filter(f => f.status === 'pendente');
    const concludedFreights = freights.filter(f => f.status === 'concluido');
    const canceledFreights = freights.filter(f => f.status === 'cancelado');


    return (
        <Tabs defaultValue="active">
            <TabsList className="grid w-full grid-cols-2 md:w-auto md:grid-cols-4">
                 <TabsTrigger value="active">
                    <Package className="mr-2 h-4 w-4" />
                    Ativos
                    <Badge variant="secondary" className="ml-2">{isLoading ? '...' : activeFreights.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="pending">
                    <PackageSearch className="mr-2 h-4 w-4" />
                    Pendentes
                     <Badge variant="secondary" className="ml-2">{isLoading ? '...' : pendingFreights.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="concluded">
                    <PackageCheck className="mr-2 h-4 w-4" />
                    Concluídos
                    <Badge variant="secondary" className="ml-2">{isLoading ? '...' : concludedFreights.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="canceled">
                    <Ban className="mr-2 h-4 w-4" />
                    Cancelados
                     <Badge variant="secondary" className="ml-2">{isLoading ? '...' : canceledFreights.length}</Badge>
                </TabsTrigger>
            </TabsList>
            <Card className="mt-4">
                 <CardContent className="p-0">
                    <TabsContent value="active" className="m-0">
                        {renderFreightTable(activeFreights, "Nenhum frete ativo no momento.")}
                    </TabsContent>
                    <TabsContent value="pending" className="m-0">
                        {renderFreightTable(pendingFreights, "Nenhum frete pendente.")}
                    </TabsContent>
                    <TabsContent value="concluded" className="m-0">
                        {renderFreightTable(concludedFreights, "Nenhum frete concluído.")}
                    </TabsContent>
                     <TabsContent value="canceled" className="m-0">
                        {renderFreightTable(canceledFreights, "Nenhum frete cancelado.")}
                    </TabsContent>
                 </CardContent>
            </Card>
        </Tabs>
    );
}
