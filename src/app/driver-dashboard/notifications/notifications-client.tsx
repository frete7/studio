
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { saveNotificationSettings } from '@/app/actions';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Bell, Loader2, MapPin, PlusCircle, Trash2, Download, BellRing } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

type IBGEState = { id: number; sigla: string; nome: string; };
type IBGECity = { id: number; nome: string; };

const formSchema = z.object({
  state: z.string().min(1, "Selecione um estado"),
  city: z.string().min(1, "Selecione uma cidade"),
});

type FormData = z.infer<typeof formSchema>;

export default function NotificationsClient({ userId, initialSettings }: { userId: string, initialSettings: any }) {
    const { toast } = useToast();
    const [subscribedCities, setSubscribedCities] = useState<string[]>(initialSettings?.cities || []);
    const [isSaving, setIsSaving] = useState(false);
    const [notificationPermission, setNotificationPermission] = useState<string>('default');

     useEffect(() => {
        if ('Notification' in window) {
            setNotificationPermission(Notification.permission);
        }
    }, []);

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: { state: '', city: '' },
    });

    const [states, setStates] = useState<IBGEState[]>([]);
    const [cities, setCities] = useState<IBGECity[]>([]);
    const [isLoadingStates, setIsLoadingStates] = useState(false);
    const [isLoadingCities, setIsLoadingCities] = useState(false);

    const selectedState = form.watch('state');

    useEffect(() => {
        setIsLoadingStates(true);
        fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
            .then(res => res.json())
            .then(data => {
                setStates(data);
                setIsLoadingStates(false);
            });
    }, []);

    useEffect(() => {
        if (selectedState) {
            setIsLoadingCities(true);
            form.setValue('city', '');
            fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedState}/municipios?orderBy=nome`)
                .then(res => res.json())
                .then(data => {
                    setCities(data);
                    setIsLoadingCities(false);
                });
        }
    }, [selectedState, form]);

    const handleAddCity = (data: FormData) => {
        const fullCityName = `${data.city}, ${data.state}`;
        if (subscribedCities.length >= 10) {
            toast({ variant: 'destructive', title: 'Limite atingido', description: 'Você só pode adicionar até 10 cidades.' });
            return;
        }
        if (subscribedCities.includes(fullCityName)) {
            toast({ variant: 'destructive', title: 'Cidade duplicada', description: 'Esta cidade já está na sua lista.' });
            return;
        }
        setSubscribedCities(prev => [...prev, fullCityName]);
        form.reset();
    };
    
    const handleRemoveCity = (cityToRemove: string) => {
        setSubscribedCities(prev => prev.filter(city => city !== cityToRemove));
    };

    const handleSaveSettings = async () => {
        setIsSaving(true);
        try {
            await saveNotificationSettings(userId, subscribedCities);
            toast({ title: 'Sucesso!', description: 'Suas preferências de notificação foram salvas.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao salvar', description: 'Não foi possível salvar suas configurações.' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const requestNotificationPermission = async () => {
        if (!('Notification' in window)) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Este navegador não suporta notificações.' });
            return;
        }

        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);

        if (permission === 'granted') {
            toast({ title: 'Sucesso!', description: 'Notificações autorizadas.' });
            // Here you would typically register the service worker and get the subscription
        } else {
            toast({ variant: 'destructive', title: 'Permissão negada', description: 'Você precisa autorizar para receber notificações.' });
        }
    }
    
    const getPermissionStatus = () => {
        switch(notificationPermission) {
            case 'granted':
                return <Badge variant="default">Autorizado</Badge>;
            case 'denied':
                return <Badge variant="destructive">Negado</Badge>;
            default:
                return <Badge variant="secondary">Pendente</Badge>;
        }
    }


    return (
        <div className="space-y-8">
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BellRing className="h-5 w-5"/> Status da Permissão</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4">
                     <div className="flex items-center gap-2">
                        <p className="text-sm">Status atual:</p>
                        {getPermissionStatus()}
                    </div>
                    <Button onClick={requestNotificationPermission} disabled={notificationPermission === 'granted'}>
                        <Bell className="mr-2 h-4 w-4" />
                        Autorizar Notificações
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Cidades de Interesse</CardTitle>
                    <CardDescription>Adicione as cidades para as quais deseja receber notificações de frete. (Máximo de 10)</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleAddCity)} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="state"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Estado</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingStates}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                                                <SelectContent>{states.map(s => <SelectItem key={s.id} value={s.sigla}>{s.nome}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="city"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Cidade</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value} disabled={!selectedState || isLoadingCities}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                                                <SelectContent>{cities.map(c => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <Button type="submit" className="w-full md:w-auto" disabled={subscribedCities.length >= 10}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Adicionar Cidade
                            </Button>
                        </form>
                    </Form>
                    <Separator className="my-6" />
                    <div>
                        <h4 className="font-medium mb-4">Cidades Salvas ({subscribedCities.length}/10)</h4>
                        {subscribedCities.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Nenhuma cidade adicionada ainda.</p>
                        ) : (
                            <div className="space-y-3">
                                {subscribedCities.map(city => (
                                    <div key={city} className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                                        <p className="text-sm font-medium flex items-center gap-2"><MapPin className="h-4 w-4 text-primary"/>{city}</p>
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveCity(city)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row justify-end gap-4">
                 <Button variant="outline" disabled={isSaving}>
                    <Download className="mr-2 h-4 w-4" />
                    DOWNLOAD
                </Button>
                <Button onClick={handleSaveSettings} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Alterações
                </Button>
            </div>
        </div>
    );
}
