
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { type Freight } from '@/app/actions';
import { Loader2, ArrowLeft, User, Mail, Phone, Calendar, MapPin, Package, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { format } from "date-fns";
import { ptBR } from 'date-fns/locale';

// This is a simplified version of the Freight type from actions, adapted for details display
type FreightDetails = Freight & {
    contact?: {
        fullName: string;
        email: string;
        phone: string;
        phoneType: string;
    },
    items?: {
        type: string;
        description?: string;
        list?: { value: string }[];
    }
    // other specific fields from the request form
};

export default function FreightDetailsPage() {
    const [freight, setFreight] = useState<FreightDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const params = useParams();
    const router = useRouter();
    const freightId = params.freightId as string;

    useEffect(() => {
        if (!freightId) {
            setError("ID do frete não encontrado.");
            setIsLoading(false);
            return;
        }

        const fetchFreight = async () => {
            setIsLoading(true);
            try {
                const docRef = doc(db, 'freights', freightId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setFreight(docSnap.data() as FreightDetails);
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

        fetchFreight();

    }, [freightId]);
    
    const renderLocationDetails = (location: any, title: string) => (
        <div className="space-y-1">
            <h4 className="font-semibold">{title}</h4>
            <p className="text-sm text-muted-foreground">
                {location.city}, {location.state} (Bairro: {location.neighborhood})
            </p>
            {location.dateTime && (
                 <p className="text-sm text-muted-foreground">
                    Data: {format(new Date(location.dateTime.seconds * 1000), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
            )}
            <p className="text-sm text-muted-foreground">
                Tipo: {location.locationType}, Andar: {location.floor}, Acesso: {location.accessType || 'N/A'}
            </p>
        </div>
    );

    if (isLoading) {
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
                            Detalhes do Frete
                        </h1>
                         <Badge variant="outline" className="text-base font-semibold border-primary/50 text-primary">
                            {freight.freightType === 'comum' ? 'COMUM' : 'OUTRO'}
                        </Badge>
                    </div>
                     <p className="text-muted-foreground">Código: {freight.id}</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <MapPin className="h-5 w-5" />
                            Rota
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* @ts-ignore */}
                        {freight.origin && renderLocationDetails(freight.origin, "Origem")}
                        <Separator />
                        {/* @ts-ignore */}
                        {freight.destinations?.map((dest: any, index: number) => (
                           <div key={index} className="space-y-2">
                             {renderLocationDetails(dest, `Destino ${index + 1}`)}
                           </div>
                        ))}
                    </CardContent>
                </Card>
                
                {freight.items && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                               <Package className="h-5 w-5" />
                                Itens a Transportar
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {freight.items.type === 'description' ? (
                                <p className="text-muted-foreground">{freight.items.description}</p>
                            ) : (
                                <ul className="list-disc list-inside text-muted-foreground">
                                    {freight.items.list?.map((item, index) => <li key={index}>{item.value}</li>)}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                )}


                {freight.contact && (
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                               <User className="h-5 w-5" />
                                Contato do Solicitante
                            </CardTitle>
                            <CardDescription>
                                Entre em contato para negociar os detalhes do frete.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                             <div className="flex items-center gap-3">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{freight.contact.fullName}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{freight.contact.email}</span>
                            </div>
                             <div className="flex items-center gap-3">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{freight.contact.phone} ({freight.contact.phoneType})</span>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
