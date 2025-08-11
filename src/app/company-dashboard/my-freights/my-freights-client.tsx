
'use client';

import { useState, useEffect, useMemo } from 'react';
import { type Freight, updateFreightStatus } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Package, PackageCheck, Filter, X, Search, PackagePlus } from 'lucide-react';
import { cva } from 'class-variance-authority';
import Link from 'next/link';

const freightTypeVariants = cva(
  "",
  {
    variants: {
      freightType: {
        comum: "border-transparent bg-purple-500 text-white hover:bg-purple-600",
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

export default function MyFreightsClient({ initialFreights }: { initialFreights: Freight[] }) {
    const [freights, setFreights] = useState(initialFreights);
    const [isLoading, setIsLoading] = useState(false);
    const [filters, setFilters] = useState({ origin: '', destination: '', type: 'all' });
    const { toast } = useToast();

    // Since initialFreights comes from a server component, we update the state if it changes.
    useEffect(() => {
        setFreights(initialFreights);
    }, [initialFreights]);

    const handleUpdateStatus = async (freightId: string, firestoreId: string, status: Freight['status']) => {
        try {
            await updateFreightStatus(freightId, status);
            // Optimistically update UI
            setFreights(prevFreights => prevFreights.map(f =>
                f.id === freightId ? { ...f, status } : f
            ));
            toast({ title: 'Sucesso', description: `Frete #${freightId} marcado como concluído.` });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível atualizar o status do frete.' });
        }
    };
    
    const filteredFreights = useMemo(() => {
        return freights.filter(f => {
            const originMatch = !filters.origin || f.origin.city.toLowerCase().includes(filters.origin.toLowerCase());
            const destinationMatch = !filters.destination || f.destinations.some(d => d.city.toLowerCase().includes(filters.destination.toLowerCase()));
            const typeMatch = filters.type === 'all' || f.freightType === filters.type;
            return originMatch && destinationMatch && typeMatch;
        });
    }, [freights, filters]);

    const activeFreights = filteredFreights.filter(f => f.status === 'ativo');
    const concludedFreights = filteredFreights.filter(f => f.status === 'concluido');

    const renderFreightTable = (data: Freight[], isConcluded = false) => {
        if (data.length === 0) {
            return <p className="text-center text-muted-foreground py-8">Nenhum frete encontrado.</p>;
        }
        return (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Rota / Pedido</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map(f => (
                        <TableRow key={f.id}>
                            <TableCell>
                                <div className="font-medium">{f.origin.city} &rarr; {f.destinations[0]?.city}</div>
                                {f.destinations.length > 1 && <div className="text-xs text-muted-foreground">+{f.destinations.length - 1} outros destinos</div>}
                                <div className="text-xs text-muted-foreground font-mono">{f.id}</div>
                            </TableCell>
                            <TableCell><Badge className={freightTypeVariants({ freightType: f.freightType })}>{getFreightTypeLabel(f.freightType)}</Badge></TableCell>
                            <TableCell>{f.createdAt ? new Date(f.createdAt).toLocaleDateString('pt-BR') : 'N/A'}</TableCell>
                            <TableCell className="text-right">
                                {!isConcluded && (
                                     <Button size="sm" onClick={() => handleUpdateStatus(f.id, (f as any).firestoreId, 'concluido')}>Concluir</Button>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        );
    }

    return (
        <div>
            <Card className="mb-6">
                 <CardContent className="p-4">
                    <div className="grid md:grid-cols-4 gap-4 items-end">
                        <div className="md:col-span-1">
                            <label className="text-sm font-medium">Origem</label>
                            <Input placeholder="Buscar por cidade de origem" value={filters.origin} onChange={e => setFilters(f => ({...f, origin: e.target.value}))} />
                        </div>
                         <div className="md:col-span-1">
                            <label className="text-sm font-medium">Destino</label>
                            <Input placeholder="Buscar por cidade de destino" value={filters.destination} onChange={e => setFilters(f => ({...f, destination: e.target.value}))} />
                        </div>
                         <div className="md:col-span-1">
                            <label className="text-sm font-medium">Tipo de Frete</label>
                            <Select value={filters.type} onValueChange={value => setFilters(f => ({...f, type: value}))}>
                                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os Tipos</SelectItem>
                                    <SelectItem value="agregamento">Agregamento</SelectItem>
                                    <SelectItem value="frete-completo">Frete Completo</SelectItem>
                                    <SelectItem value="frete-retorno">Frete de Retorno</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button variant="outline" onClick={() => setFilters({ origin: '', destination: '', type: 'all' })}>
                            <X className="mr-2 h-4 w-4"/>
                            Limpar Filtros
                        </Button>
                    </div>
                 </CardContent>
            </Card>

            <Tabs defaultValue="active">
                <TabsList>
                    <TabsTrigger value="active">
                        <Package className="mr-2 h-4 w-4"/>
                        Ativos
                        <Badge variant="secondary" className="ml-2">{activeFreights.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="concluded">
                        <PackageCheck className="mr-2 h-4 w-4"/>
                        Concluídos
                        <Badge variant="secondary" className="ml-2">{concludedFreights.length}</Badge>
                    </TabsTrigger>
                </TabsList>
                 <Card className="mt-4">
                    <CardContent className="p-0">
                        <TabsContent value="active" className="m-0">
                            {renderFreightTable(activeFreights)}
                        </TabsContent>
                        <TabsContent value="concluded" className="m-0">
                             {renderFreightTable(concludedFreights, true)}
                        </TabsContent>
                    </CardContent>
                 </Card>
            </Tabs>
        </div>
    );
}
