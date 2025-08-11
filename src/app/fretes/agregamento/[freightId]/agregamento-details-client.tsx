
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, MapPin, Truck, Box, Check, X, Building, Phone } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

type AgregamentoDetailsClientProps = {
    initialFreight: any;
    initialBodyworkNames: string[];
    initialVehicleNames: string[];
};

const DetailItem = ({ label, value, isBool }: { label: string; value?: string | number | boolean | null; isBool?: boolean }) => {
    if (value === undefined || value === null || value === '') return null;
    let displayValue: React.ReactNode = value.toString();
    if (isBool) {
        displayValue = value ? <Check className="h-5 w-5 text-green-500" /> : <X className="h-5 w-5 text-destructive" />;
    }
    return (
        <div className="flex justify-between items-center py-2 border-b">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-sm font-semibold text-right">{displayValue}</p>
        </div>
    );
};

const DetailList = ({ label, items }: { label: string; items?: string[] | { value: string }[] }) => {
    if (!items || items.length === 0) return null;
    return (
        <div className="py-2 border-b">
            <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
            <ul className="list-disc list-inside pl-2 space-y-1 text-sm">
                {items.map((item, index) => (
                    <li key={index}>
                        {typeof item === 'string' ? item : item.value}
                    </li>
                ))}
            </ul>
        </div>
    );
};


export default function AgregamentoDetailsClient({
    initialFreight,
    initialBodyworkNames,
    initialVehicleNames,
}: AgregamentoDetailsClientProps) {
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
                                    <CardTitle className="text-2xl md:text-3xl text-primary font-headline">Detalhes do Agregamento</CardTitle>
                                    <CardDescription>Pedido: {freight.id}</CardDescription>
                                </div>
                                 <Badge variant="secondary" className="text-lg">Agregamento</Badge>
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
                                     <h3 className="font-semibold flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> Destinos</h3>
                                      <ul className="list-disc list-inside pl-7">
                                        {freight.destinations.map((dest: any, index: number) => (
                                            <li key={index}>{dest.city}, {dest.state}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                         <CardTitle className="flex items-center gap-2"><Box className="h-6 w-6 text-primary" /> Informações da Carga e Operação</CardTitle>
                    </CardHeader>
                     <CardContent className="space-y-2">
                        <DetailItem label="O que será carregado" value={orderDetails.whatWillBeLoaded} />
                        <DetailItem label="Tipo de Carga" value={orderDetails.cargoType} />
                        <DetailItem label="Ordem de Carregamento" value={orderDetails.loadingOrder} />
                        <DetailList label="Horários de Carregamento" items={orderDetails.loadingTimes} />
                        <DetailItem label="Carga Perigosa" value={orderDetails.isDangerousCargo} isBool />
                        <DetailItem label="Mercadoria tem Nota Fiscal" value={orderDetails.hasInvoice} isBool />
                    </CardContent>
                </Card>
                
                 <Card>
                    <CardHeader>
                         <CardTitle className="flex items-center gap-2"><Truck className="h-6 w-6 text-primary" /> Requisitos do Veículo e Motorista</CardTitle>
                    </CardHeader>
                     <CardContent className="space-y-2">
                        <DetailList label="Tipos de Veículo" items={initialVehicleNames} />
                        <DetailList label="Tipos de Carroceria" items={initialBodyworkNames} />
                        <DetailItem label="Idade mínima do veículo" value={orderDetails.minimumVehicleAge === 'none' ? 'Nenhuma' : orderDetails.minimumVehicleAge} />
                         <Separator className="my-2"/>
                        <DetailItem label="Precisa de Rastreador" value={orderDetails.needsTracker} isBool />
                        <DetailItem label="Tipo de Rastreador" value={orderDetails.trackerType} />
                         <Separator className="my-2"/>
                        <DetailItem label="Motorista precisa ter ANTT" value={orderDetails.driverNeedsANTT} isBool />
                        <DetailItem label="Motorista precisa emitir NF" value={orderDetails.driverNeedsToIssueInvoice} isBool />
                         <DetailItem label="Precisa de Cursos Específicos" value={orderDetails.needsSpecificCourses} isBool />
                        <DetailList label="Cursos Necessários" items={orderDetails.specificCourses} />
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                         <CardTitle>Valores e Condições</CardTitle>
                    </CardHeader>
                     <CardContent className="space-y-2">
                         {orderDetails.isPriceToCombine ? (
                            <div className="text-center p-4 bg-muted rounded-md">
                                <p className="font-semibold text-lg">Valor a Combinar</p>
                                <p className="text-sm text-muted-foreground">O valor será negociado diretamente com a empresa.</p>
                            </div>
                         ) : (
                            <Accordion type="multiple" className="w-full">
                                {freight.requiredVehicles.map((vehicle: any) => (
                                     <AccordionItem key={vehicle.id} value={vehicle.id}>
                                        <AccordionTrigger className="font-semibold text-base">{vehicle.name}</AccordionTrigger>
                                        <AccordionContent>
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="text-left border-b">
                                                        <th className="p-2">De (km)</th>
                                                        <th className="p-2">Até (km)</th>
                                                        <th className="p-2 text-right">Valor (R$)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                     {vehicle.priceTable?.map((price: any, index: number) => (
                                                        <tr key={index} className="border-b last:border-0">
                                                            <td className="p-2">{price.kmStart}</td>
                                                            <td className="p-2">{price.kmEnd}</td>
                                                            <td className="p-2 text-right font-medium">{price.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </AccordionContent>
                                     </AccordionItem>
                                ))}
                            </Accordion>
                         )}
                         <Separator className="my-4" />
                        <DetailItem label="Pedágio pago por" value={orderDetails.whoPaysToll} />
                        <DetailItem label="Pedágio cobre" value={orderDetails.tollTripScope} />
                        <DetailItem label="Motorista ajuda" value={orderDetails.driverNeedsToHelp} isBool />
                        <DetailItem label="Ajuda em" value={orderDetails.driverHelpScope} />
                        <DetailItem label="Precisa de ajudante" value={orderDetails.needsHelper} isBool />
                        <DetailItem label="Ajudante pago por" value={orderDetails.whoPaysHelper} />
                        <DetailList label="Formas de Pagamento" items={orderDetails.paymentMethods?.map((p:string) => ({value:p}))} />
                        <DetailList label="Benefícios" items={orderDetails.benefits} />
                    </CardContent>
                </Card>

                 <Card className="bg-primary/10 border-primary/20">
                    <CardHeader>
                        <CardTitle className="text-primary">Como se Candidatar?</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p>Para se candidatar a esta vaga de agregamento, entre em contato com os responsáveis abaixo:</p>
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
