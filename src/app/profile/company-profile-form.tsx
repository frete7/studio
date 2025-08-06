
'use client';

import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, updateDoc } from 'firebase/firestore';
import { db, app } from '@/lib/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Loader2, UploadCloud, FileText, CheckCircle, Building } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';


// =================================================================
// Schemas e Funções de Validação
// =================================================================

function validateCPF(cpf: string) {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
    const digits = cpf.split('').map(Number);
    const validator = (n: number) => (digits.slice(0, n).reduce((sum, digit, index) => sum + digit * (n + 1 - index), 0) * 10) % 11 % 10;
    return validator(9) === digits[9] && validator(10) === digits[10];
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ACCEPTED_DOCUMENT_TYPES = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];


const profileSchema = z.object({
    // Etapa 1
    razaoSocial: z.string().min(3, 'Razão Social é obrigatória.'),
    nomeFantasia: z.string().min(3, 'Nome Fantasia é obrigatório.'),
    // Etapa 2
    cep: z.string().length(9, 'CEP deve ter 8 números.'),
    logradouro: z.string().min(1, 'Endereço é obrigatório.'),
    numero: z.string().min(1, 'Número é obrigatório.'),
    complemento: z.string().optional(),
    bairro: z.string().min(1, 'Bairro é obrigatório.'),
    cidade: z.string().min(1, 'Cidade é obrigatória.'),
    uf: z.string().min(2, 'UF é obrigatório.'),
    // Etapa 3
    companyLogo: z.any().refine((file) => file?.length == 1 ? ACCEPTED_IMAGE_TYPES.includes(file?.[0]?.type) : true, "Apenas .jpg, .jpeg, .png and .webp são aceitos.")
        .refine((file) => file?.length == 1 ? file[0]?.size <= MAX_FILE_SIZE : true, `Tamanho máximo é 5MB.`),
    // Etapa 4
    responsibleName: z.string().min(3, "Nome do responsável é obrigatório."),
    responsibleCpf: z.string().refine(validateCPF, "CPF inválido."),
    responsibleDocument: z.any().refine((file) => file?.length == 1, "Documento é obrigatório.")
        .refine((file) => file?.length == 1 ? ACCEPTED_DOCUMENT_TYPES.includes(file?.[0]?.type) : false, "Apenas .jpg, .png e .pdf são aceitos.")
        .refine((file) => file?.length == 1 ? file[0]?.size <= MAX_FILE_SIZE : false, `Tamanho máximo é 5MB.`),
    cnpjCard: z.any().refine((file) => file?.length == 1, "Cartão CNPJ é obrigatório.")
        .refine((file) => file?.length == 1 ? ACCEPTED_DOCUMENT_TYPES.includes(file?.[0]?.type) : false, "Apenas .jpg, .png e .pdf são aceitos.")
        .refine((file) => file?.length == 1 ? file[0]?.size <= MAX_FILE_SIZE : false, `Tamanho máximo é 5MB.`),
    // Etapa 5
    isCarrier: z.enum(['yes', 'no'], { required_error: "Selecione uma opção." }),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const steps = [
    { id: 1, name: 'Dados da Empresa', fields: ['razaoSocial', 'nomeFantasia'] },
    { id: 2, name: 'Endereço', fields: ['cep', 'logradouro', 'numero', 'bairro', 'cidade', 'uf'] },
    { id: 3, name: 'Identidade Visual', fields: ['companyLogo'] },
    { id: 4, name: 'Documentos', fields: ['responsibleName', 'responsibleCpf', 'responsibleDocument', 'cnpjCard'] },
    { id: 5, name: 'Finalização', fields: ['isCarrier'] },
];

const storage = getStorage(app);

// =================================================================
// Componente Principal
// =================================================================
export default function CompanyProfileForm({ profile }: { profile: any }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const methods = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        mode: "onBlur",
        defaultValues: {
            razaoSocial: profile.name || '',
            nomeFantasia: profile.tradingName || '',
            cep: profile.addressDetails?.cep || '',
            logradouro: profile.addressDetails?.logradouro || '',
            numero: profile.addressDetails?.numero || '',
            complemento: profile.addressDetails?.complemento || '',
            bairro: profile.addressDetails?.bairro || '',
            cidade: profile.addressDetails?.cidade || '',
            uf: profile.addressDetails?.uf || '',
        }
    });

    const { handleSubmit, trigger, control, watch } = methods;

    const uploadFile = async (file: File, path: string): Promise<string> => {
        const fileRef = ref(storage, path);
        await uploadBytes(fileRef, file);
        return await getDownloadURL(fileRef);
    };

    const processForm = async (data: ProfileFormData) => {
        setIsLoading(true);
        try {
            const userId = profile.uid;
            const updateData: any = {
                name: data.razaoSocial,
                tradingName: data.nomeFantasia,
                address: `${data.logradouro}, ${data.numero}, ${data.bairro}, ${data.cidade} - ${data.uf}`,
                addressDetails: {
                    cep: data.cep,
                    logradouro: data.logradouro,
                    numero: data.numero,
                    complemento: data.complemento,
                    bairro: data.bairro,
                    cidade: data.cidade,
                    uf: data.uf,
                },
                responsible: {
                    name: data.responsibleName,
                    cpf: data.responsibleCpf,
                },
                isCarrier: data.isCarrier === 'yes',
                status: 'pending' // Update status after completion
            };

            // Handle uploads
            if (data.companyLogo && data.companyLogo[0]) {
                updateData.photoURL = await uploadFile(data.companyLogo[0], `users/${userId}/logo`);
            }
            if (data.responsibleDocument && data.responsibleDocument[0]) {
                updateData.responsible.documentUrl = await uploadFile(data.responsibleDocument[0], `users/${userId}/responsible_document`);
            }
            if (data.cnpjCard && data.cnpjCard[0]) {
                updateData.cnpjCardUrl = await uploadFile(data.cnpjCard[0], `users/${userId}/cnpj_card`);
            }

            const userDocRef = doc(db, 'users', userId);
            await updateDoc(userDocRef, updateData);

            toast({
                title: "Perfil atualizado!",
                description: "Seus dados foram enviados para análise.",
            });
            // The parent page will automatically show the "pending" view due to the status change
        } catch (error) {
            console.error("Error updating profile:", error);
            toast({
                variant: 'destructive',
                title: "Erro ao atualizar",
                description: "Não foi possível salvar suas informações. Tente novamente."
            });
        } finally {
            setIsLoading(false);
        }
    };

    const nextStep = async () => {
        const fields = steps[currentStep].fields as (keyof ProfileFormData)[];
        const output = await trigger(fields, { shouldFocus: true });
        if (!output) return;

        if (currentStep < steps.length - 1) {
            setCurrentStep(step => step + 1);
        } else {
            await handleSubmit(processForm)();
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(step => step - 1);
        }
    };

    const progress = ((currentStep + 1) / steps.length) * 100;
    
    const FileInput = ({ name, label, description }: { name: any, label: string, description: string }) => {
        const file = watch(name);
        const fileName = file?.[0]?.name;
        
        return (
             <FormField
                control={control}
                name={name}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{label}</FormLabel>
                        <FormControl>
                            <div className="relative">
                                <label htmlFor={name} className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/75">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <UploadCloud className="w-8 h-8 mb-4 text-muted-foreground" />
                                        <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Clique para enviar</span> ou arraste e solte</p>
                                        <p className="text-xs text-muted-foreground">{description}</p>
                                    </div>
                                    <Input 
                                        id={name} 
                                        type="file" 
                                        className="hidden"
                                        onBlur={field.onBlur}
                                        name={field.name}
                                        onChange={(e) => field.onChange(e.target.files)}
                                    />
                                </label>
                            </div>
                        </FormControl>
                         {fileName && (
                            <div className="text-sm font-medium text-muted-foreground flex items-center gap-2 mt-2">
                                <FileText className="h-4 w-4"/>
                                <span>{fileName}</span>
                                <CheckCircle className="h-4 w-4 text-green-500" />
                            </div>
                         )}
                        <FormMessage />
                    </FormItem>
                )}
            />
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Complete seu Perfil</CardTitle>
                <CardDescription>Para garantir a segurança da plataforma, precisamos de mais algumas informações.</CardDescription>
                <Separator className='pt-4' />
                <div className="pt-4">
                    <p className="text-sm text-muted-foreground">Etapa {currentStep + 1} de {steps.length}: {steps[currentStep].name}</p>
                    <Progress value={progress} className="mt-2" />
                </div>
            </CardHeader>
            <CardContent>
                <FormProvider {...methods}>
                    <form onSubmit={handleSubmit(processForm)} className="space-y-6">
                        {/* ETAPA 1 */}
                        <div className={cn("space-y-6", currentStep !== 0 && "hidden")}>
                             <FormField
                                control={control}
                                name="razaoSocial"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Razão Social</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={control}
                                name="nomeFantasia"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nome Fantasia</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        {/* ETAPA 2 */}
                        <div className={cn("space-y-6", currentStep !== 1 && "hidden")}>
                            {/* Campos de endereço já estão no form, só precisam ser mostrados */}
                             <div className="grid md:grid-cols-3 gap-4">
                                <FormField control={control} name="cep" render={({ field }) => (<FormItem><FormLabel>CEP</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={control} name="uf" render={({ field }) => (<FormItem><FormLabel>UF</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={control} name="cidade" render={({ field }) => (<FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                            <FormField control={control} name="logradouro" render={({ field }) => (<FormItem><FormLabel>Logradouro</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <div className="grid md:grid-cols-3 gap-4">
                                <FormField control={control} name="bairro" render={({ field }) => (<FormItem className="col-span-2"><FormLabel>Bairro</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={control} name="numero" render={({ field }) => (<FormItem><FormLabel>Número</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                             <FormField
                                control={control}
                                name="complemento"
                                render={({ field }) => (<FormItem><FormLabel>Complemento (Opcional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}
                            />
                        </div>
                         {/* ETAPA 3 */}
                        <div className={cn(currentStep !== 2 && "hidden")}>
                            <FileInput name="companyLogo" label="Logo da Empresa (Opcional)" description="PNG, JPG, WEBP (MAX. 5MB)" />
                        </div>
                         {/* ETAPA 4 */}
                        <div className={cn("space-y-6", currentStep !== 3 && "hidden")}>
                             <FormField
                                control={control}
                                name="responsibleName"
                                render={({ field }) => (<FormItem><FormLabel>Nome Completo do Responsável</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}
                            />
                             <FormField
                                control={control}
                                name="responsibleCpf"
                                render={({ field }) => (<FormItem><FormLabel>CPF do Responsável</FormLabel><FormControl><Input placeholder="000.000.000-00" {...field} /></FormControl><FormMessage /></FormItem>
                                )}
                            />
                             <FileInput name="responsibleDocument" label="Documento do Responsável (Frente e Verso)" description="RG ou CNH. PNG, JPG, PDF (MAX. 5MB)" />
                             <FileInput name="cnpjCard" label="Cartão CNPJ" description="Cartão CNPJ da empresa. PNG, JPG, PDF (MAX. 5MB)" />
                        </div>
                        {/* ETAPA 5 */}
                         <div className={cn(currentStep !== 4 && "hidden")}>
                             <FormField
                                control={control}
                                name="isCarrier"
                                render={({ field }) => (
                                    <FormItem className="space-y-3">
                                        <FormLabel className="text-base">Sua empresa é uma Transportadora?</FormLabel>
                                        <FormDescription>
                                            Isso nos ajuda a entender melhor seu negócio para oferecer as melhores oportunidades.
                                        </FormDescription>
                                        <FormControl>
                                            <RadioGroup
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            className="flex items-center gap-6 pt-2"
                                            >
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl><RadioGroupItem value="yes" /></FormControl>
                                                <FormLabel className="font-normal">Sim</FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-3 space-y-0">
                                                <FormControl><RadioGroupItem value="no" /></FormControl>
                                                <FormLabel className="font-normal">Não</FormLabel>
                                            </FormItem>
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                    </form>
                </FormProvider>
                 <div className="mt-8 flex justify-between">
                    <Button onClick={prevStep} variant="outline" disabled={currentStep === 0 || isLoading}>
                        Voltar
                    </Button>
                    <Button onClick={nextStep} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {currentStep < steps.length - 1 ? 'Próximo' : 'Enviar para Análise'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
