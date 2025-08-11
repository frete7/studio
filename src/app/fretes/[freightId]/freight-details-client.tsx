
'use client';

import { useState } from 'react';
import { type Freight } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, MapPin, Truck, Box, Check, X, Building, Phone, Calendar, Weight, Ruler } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type FreightDetailsClientProps = {
    initialFreight: Freight;
};

const getFreightTypeLabel = (type: Freight['freightType']): string => {
    const labels = {
        'comum': 'Comum',
        'agregamento': 'Agregamento',
        'frete-completo': 'Completo',
        'frete-retorno': 'Retorno',
    };
    return labels[type] || 'N/A';
}

const DetailItem = ({ label, value, isBool, icon: Icon }: { label: string; value?: string | number | boolean | null; isBool?: boolean; icon?: React.ElementType }) => {
    if (value === undefined || value === null || value === '') return null;
    let displayValue: React.ReactNode = value.toString();
    if (isBool) {
        displayValue = value ? <Check className="h-5 w-5 text-green-500" /> : <X className="h-5 w-5 text-destructive" />;
    }
    return (
        <div className="flex justify-between items-center py-2 border-b">
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                {Icon && <Icon className="h-4 w-4" />}
                {label}
            </p>
            <p className="text-sm font-semibold text-right">{displayValue}</p>
        </div>
    );
};


export default function FreightDetailsClient({ initialFreight }: FreightDetailsClientProps) {
    const [freight] = useState(initialFreight);
    const { orderDetails } = freight;

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="max-w-4xl mx-auto space-y-8">
                <div>
                     <Button asChild variant="outline" className="mb-4">
                        <Link href="/fretes">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Voltar para a busca
                        </Link>
                    </Button>
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-2xl md:text-3xl text-primary font-headline">Detalhes do Frete</CardTitle>
                                    <CardDescription>Pedido: {freight.id}</CardDescription>
                                </div>
                                 <Badge variant="secondary" className="text-lg">{getFreightTypeLabel(freight.freightType)}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                             <div className="flex items-center gap-2 text-muted-foreground mb-4">
                                <Building className="h-5 w-5" />
                                <span className="font-semibold">{freight.companyName}</span>
                            </div>
                            <Separator />
                            <div className="mt-4 grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                     <h3 className="font-semibold flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> Origem</h3>
                                     <p className="pl-7">{freight.origin.city}, {freight.origin.state}</p>
                                </div>
                                <div className="space-y-2">
                                     <h3 className="font-semibold flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> Destino(s)</h3>
                                      <ul className="list-disc list-inside pl-7">
                                        {freight.destinations.map((dest: any, index: number) => (
                                            <li key={index}>{dest.city}, {dest.state} ({dest.stops} parada(s))</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                         <CardTitle className="flex items-center gap-2"><Box className="h-6 w-6 text-primary" /> Informações da Carga</CardTitle>
                    </CardHeader>
                     <CardContent className="space-y-2">
                        <DetailItem label="O que será carregado" value={orderDetails.whatWillBeLoaded} />
                        <DetailItem label="Peso Total" value={`${orderDetails.weight} kg`} icon={Weight} />
                        <DetailItem label="Tipo de Carga" value={orderDetails.cargoType} />
                        <DetailItem label="Data de Carregamento" value={orderDetails.loadingDate ? format(new Date(orderDetails.loadingDate), "dd/MM/yyyy", { locale: ptBR }) : 'N/A'} icon={Calendar} />
                        {orderDetails.dimensions && (
                            <div className="text-sm text-muted-foreground pt-2">
                                <p className="font-medium flex items-center gap-2"><Ruler className="h-4 w-4" /> Dimensões:</p>
                                <p className="pl-6">
                                    {orderDetails.dimensions.height}m (altura) x {orderDetails.dimensions.width}m (largura) x {orderDetails.dimensions.length}m (comprimento)
                                </p>
                            </div>
                        )}
                        <DetailItem label="Cubagem" value={orderDetails.cubicMeters ? `${orderDetails.cubicMeters} m³` : 'N/A'} />
                        <DetailItem label="Carga Perigosa" value={orderDetails.isDangerousCargo} isBool />
                        <DetailItem label="Mercadoria tem Nota Fiscal" value={orderDetails.hasInvoice} isBool />
                    </CardContent>
                </Card>
                
                 <Card>
                    <CardHeader>
                         <CardTitle className="flex items-center gap-2"><Truck className="h-6 w-6 text-primary" /> Requisitos do Veículo e Motorista</CardTitle>
                    </CardHeader>
                     <CardContent className="space-y-2">
                        <DetailItem label="Pedágio pago por" value={orderDetails.whoPaysToll} />
                        <DetailItem label="Precisa de Rastreador" value={orderDetails.needsTracker} isBool />
                        <DetailItem label="Tipo de Rastreador" value={orderDetails.trackerType} />
                         <Separator className="my-2"/>
                        <DetailItem label="Motorista precisa ter ANTT" value={orderDetails.driverNeedsANTT} isBool />
                        <DetailItem label="Motorista precisa emitir NF" value={orderDetails.driverNeedsToIssueInvoice} isBool />
                        <DetailItem label="Ajuda do Motorista" value={orderDetails.driverNeedsToHelp} />
                        <DetailItem label="Precisa de Ajudante" value={orderDetails.needsHelper} isBool />
                        <DetailItem label="Ajudante pago por" value={orderDetails.whoPaysHelper} />
                    </CardContent>
                </Card>

                 <Card className="bg-primary/10 border-primary/20">
                    <CardHeader>
                        <CardTitle className="text-primary">Valor e Contato</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       {freight.isPriceToCombine ? (
                             <div className="text-center p-4 bg-muted rounded-md">
                                <p className="font-semibold text-lg">Valor a Combinar</p>
                                <p className="text-sm text-muted-foreground">O valor será negociado diretamente com a empresa.</p>
                            </div>
                       ): (
                            <div className="text-center">
                                <p className="text-sm text-muted-foreground">Valor do Frete</p>
                                <p className="text-4xl font-bold text-primary">{Number(freight.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                            </div>
                       )}

                        <Separator/>
                        
                        <p>Para se candidatar a esta vaga, entre em contato com os responsáveis abaixo:</p>
                        <ul className="space-y-3">
                            {freight.responsibleCollaborators.map((c: any) => (
                                <li key={c.id} className="p-3 border bg-background rounded-md flex items-center gap-4">
                                     <div className="p-2 bg-primary/20 rounded-full">
                                        <Phone className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">{c.name}</p>
                                        <a href={`tel:${c.phone}`} className="text-muted-foreground hover:underline">{c.phone}</a>
                                    </div>
                                </li>
                            ))}
                        </ul>
                         <Button className="w-full mt-4" size="lg">Ligar para a Empresa</Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

