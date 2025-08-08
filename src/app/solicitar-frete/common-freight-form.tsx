'use client';

import { useState } from 'react';
import { useForm, FormProvider, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { addCompleteFreight } from '@/app/actions';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, PlusCircle, Trash2, Info, CheckCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const locationSchema = z.object({
  city: z.string().min(2, "Cidade é obrigatória"),
  state: z.string().length(2, "UF é obrigatório"),
  neighborhood: z.string().optional(),
  dateTime: z.date().optional(),
  locationType: z.enum(['casa', 'apartamento', 'empresa', 'armazem', 'outro']).optional(),
  floor: z.string().optional(),
  accessType: z.enum(['elevador', 'escada', 'rampa']).optional(),
  distance: z.coerce.number().optional(),
});

const formSchema = z.object({
  contact: z.object({
    fullName: z.string().min(3, "Nome completo é obrigatório."),
    email: z.string().email("Email inválido."),
    phone: z.string().min(10, "Telefone inválido."),
    phoneType: z.enum(['whatsapp', 'ligacao']),
  }),
  origin: locationSchema,
  destinations: z.array(locationSchema).min(1, "Adicione pelo menos um destino."),
  items: z.object({
    type: z.enum(['description', 'list']),
    description: z.string().optional(),
    list: z.array(z.object({ value: z.string().min(1) })).optional(),
  }).refine(data => data.type !== 'description' || (data.description && data.description.length > 3), {
    message: "A descrição é obrigatória.",
    path: ['description'],
  }).refine(data => data.type !== 'list' || (data.list && data.list.length > 0), {
    message: "Adicione pelo menos um item.",
    path: ['list'],
  }),
  additionalInfo: z.object({
      hasRestriction: z.boolean().default(false),
      restrictionDetails: z.string().optional(),
      needsAssembly: z.boolean().default(false),
      assemblyItems: z.array(z.object({ value: z.string().min(1)})).optional(),
      needsPackaging: z.boolean().default(false),
      packagingItems: z.array(z.object({ value: z.string().min(1)})).optional(),
      hasSchedulePreference: z.boolean().default(false),
      scheduleDetails: z.string().optional(),
      hasParkingRestriction: z.boolean().default(false),
      parkingRestrictionDetails: z.string().optional(),
      needsStorage: z.boolean().default(false),
      needsItemPackaging: z.boolean().default(false),
      itemPackagingDetails: z.array(z.object({ value: z.string().min(1)})).optional(),
      companyPreference: z.enum(['price', 'quality', 'cost_benefit']),
  }),
});

type FormData = z.infer<typeof formSchema>;

export default function CommonFreightForm() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccessOpen, setIsSuccessOpen] = useState(false);
    const [generatedId, setGeneratedId] = useState('');
    const { toast } = useToast();

    const methods = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            contact: { fullName: '', email: '', phone: '', phoneType: 'whatsapp' },
            origin: { city: '', state: '' },
            destinations: [{ city: '', state: '' }],
            items: { type: 'description', description: '', list: [] },
            additionalInfo: {
                hasRestriction: false,
                needsAssembly: false,
                needsPackaging: false,
                hasSchedulePreference: false,
                hasParkingRestriction: false,
                needsStorage: false,
                needsItemPackaging: false,
                companyPreference: 'cost_benefit',
            },
        }
    });

    const { handleSubmit, control, watch } = methods;
    const { fields, append, remove } = useFieldArray({ control, name: "destinations" });
    const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({ control, name: "items.list" });
    
    const itemsType = watch('items.type');

    async function onSubmit(data: FormData) {
        setIsSubmitting(true);
        try {
            const id = await addCompleteFreight('', 'Usuário Visitante', 'completo', data);
            setGeneratedId(id);
            setIsSuccessOpen(true);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao Enviar",
                description: "Não foi possível salvar sua solicitação. Tente novamente."
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <>
            <FormProvider {...methods}>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                    <Card>
                        <CardContent className="p-6 space-y-6">
                            <h3 className="text-xl font-semibold">1. Seus Dados de Contato</h3>
                             <FormField name="contact.fullName" control={control} render={({field}) => (<FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                             <div className="grid md:grid-cols-2 gap-4">
                                <FormField name="contact.email" control={control} render={({field}) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField name="contact.phone" control={control} render={({field}) => (<FormItem><FormLabel>Telefone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                             </div>
                             <FormField name="contact.phoneType" control={control} render={({field}) => (<FormItem><FormLabel>Preferência de Contato</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4"><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="whatsapp" /></FormControl><FormLabel>WhatsApp</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="ligacao" /></FormControl><FormLabel>Ligação</FormLabel></FormItem></RadioGroup></FormControl></FormItem>)} />
                        </CardContent>
                    </Card>
                    <Card>
                         <CardContent className="p-6 space-y-6">
                            <h3 className="text-xl font-semibold">2. Rota</h3>
                            <div className="space-y-2">
                                <p className="font-medium">Origem</p>
                                <div className="grid md:grid-cols-2 gap-4">
                                     <FormField name="origin.city" control={control} render={({field}) => (<FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                     <FormField name="origin.state" control={control} render={({field}) => (<FormItem><FormLabel>UF</FormLabel><FormControl><Input maxLength={2} {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                            </div>
                             <Separator />
                            <div className="space-y-4">
                                <p className="font-medium">Destino(s)</p>
                                {fields.map((field, index) => (
                                    <div key={field.id} className="p-4 border rounded-md space-y-4">
                                        <div className="flex justify-between items-center">
                                            <p className="font-semibold">Destino {index + 1}</p>
                                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </div>
                                         <div className="grid md:grid-cols-2 gap-4">
                                             <FormField name={`destinations.${index}.city`} control={control} render={({field}) => (<FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                             <FormField name={`destinations.${index}.state`} control={control} render={({field}) => (<FormItem><FormLabel>UF</FormLabel><FormControl><Input maxLength={2} {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>
                                    </div>
                                ))}
                                <Button type="button" variant="outline" onClick={() => append({ city: '', state: ''})}><PlusCircle className="mr-2 h-4 w-4" />Adicionar Destino</Button>
                            </div>
                         </CardContent>
                    </Card>
                     <Card>
                         <CardContent className="p-6 space-y-6">
                             <h3 className="text-xl font-semibold">3. Detalhes da Carga</h3>
                             <FormField name="items.type" control={control} render={({field}) => (<FormItem><FormLabel>Como você prefere listar os itens?</FormLabel><FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4"><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="description" /></FormControl><FormLabel>Descrever em texto</FormLabel></FormItem><FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="list" /></FormControl><FormLabel>Listar um a um</FormLabel></FormItem></RadioGroup></FormControl></FormItem>)} />
                             {itemsType === 'description' && (
                                <FormField name="items.description" control={control} render={({field}) => (<FormItem><FormControl><Textarea placeholder="Ex: 1 geladeira, 1 sofá de 3 lugares, 10 caixas médias..." {...field}/></FormControl><FormMessage /></FormItem>)} />
                             )}
                             {itemsType === 'list' && (
                                 <div className="space-y-2">
                                     {itemFields.map((field, index) => (
                                         <div key={field.id} className="flex gap-2">
                                             <FormField name={`items.list.${index}.value`} control={control} render={({field}) => (<FormItem className="flex-1"><FormControl><Input placeholder={`Item ${index + 1}`} {...field} /></FormControl><FormMessage /></FormItem>)} />
                                             <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                         </div>
                                     ))}
                                     <Button type="button" variant="outline" size="sm" onClick={() => appendItem({ value: ''})}><PlusCircle className="mr-2 h-4 w-4" />Adicionar Item</Button>
                                 </div>
                             )}
                         </CardContent>
                    </Card>
                     <Card>
                        <CardContent className="p-6 space-y-4">
                            <h3 className="text-xl font-semibold">4. Informações Adicionais</h3>
                            <FormField control={control} name="additionalInfo.companyPreference" render={({field}) => (<FormItem><FormLabel>Na escolha da empresa, o que você mais valoriza?</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="price">Preço (o mais barato)</SelectItem><SelectItem value="quality">Qualidade (a mais bem avaliada)</SelectItem><SelectItem value="cost_benefit">Custo/Benefício</SelectItem></SelectContent></Select></FormItem>)} />
                        </CardContent>
                    </Card>
                    <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin" /> : 'Finalizar e Solicitar Orçamentos'}
                    </Button>
                </form>
            </FormProvider>
            <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
                 <DialogContent>
                    <DialogHeader>
                        <div className="flex flex-col items-center text-center gap-4 py-4">
                            <CheckCircle className="h-16 w-16 text-green-500" />
                            <DialogTitle className="text-2xl">Solicitação Enviada!</DialogTitle>
                            <p className="text-muted-foreground">Sua solicitação foi enviada com sucesso. Em breve, as transportadoras entrarão em contato.</p>
                             <div className="bg-muted rounded-md p-3 w-full text-center mt-2 space-y-2">
                                <p className="text-sm font-semibold">Código do Seu Frete:</p>
                                <p className="font-mono font-bold text-primary">{generatedId}</p>
                            </div>
                        </div>
                    </DialogHeader>
                    <DialogFooter>
                         <Button className="w-full" onClick={() => setIsSuccessOpen(false)}>Fechar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
