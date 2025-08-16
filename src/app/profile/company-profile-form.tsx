
'use client';

import { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, updateDoc } from 'firebase/firestore';
import { db, app } from '@/lib/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Image from 'next/image';

import { Button, buttonVariants } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, UploadCloud, FileText, CheckCircle, Building, AlertCircle, ThumbsUp, ThumbsDown, CircleHelp, ExternalLink, Mail, User, Phone, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

// =================================================================
// Schemas e Funções de Validação
// =================================================================

function validateCPF(cpf: string) {
    if (!cpf) return false;
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11) return false;
    
    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    
    // Validação dos dígitos verificadores
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let remainder = 11 - (sum % 11);
    let digit1 = remainder < 2 ? 0 : remainder;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    remainder = 11 - (sum % 11);
    let digit2 = remainder < 2 ? 0 : remainder;
    
    return parseInt(cpf.charAt(9)) === digit1 && parseInt(cpf.charAt(10)) === digit2;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ACCEPTED_DOCUMENT_TYPES = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];

const fileSchema = z.any()
  .refine((files) => !files || files.length === 0 || files?.[0]?.size <= MAX_FILE_SIZE, `Tamanho máximo é 5MB.`)
  .refine(
    (files) => !files || files.length === 0 || ACCEPTED_DOCUMENT_TYPES.includes(files?.[0]?.type),
    "Apenas .jpg, .png e .pdf são aceitos."
  );

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
    companyLogo: z.any().optional(),
    // Etapa 4
    responsibleDocument: fileSchema.optional(),
    cnpjCard: fileSchema.optional(),
    // Etapa 5
    isCarrier: z.enum(['yes', 'no'], { required_error: "Selecione uma opção." }),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const steps = [
    { id: 1, name: 'Dados da Empresa', fields: ['razaoSocial', 'nomeFantasia'] },
    { id: 2, name: 'Endereço', fields: ['cep', 'logradouro', 'numero', 'bairro', 'cidade', 'uf', 'complemento'] },
    { id: 3, name: 'Identidade Visual', fields: ['companyLogo'] },
    { id: 4, name: 'Documentos', fields: ['responsibleDocument', 'cnpjCard'] },
    { id: 5, name: 'Finalização', fields: ['isCarrier'] },
];

export default function CompanyProfileForm({ profile, onUpdate }: { profile: any, onUpdate: () => void }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const methods = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            razaoSocial: profile.razaoSocial || '',
            nomeFantasia: profile.nomeFantasia || '',
            cep: profile.cep || '',
            logradouro: profile.logradouro || '',
            numero: profile.numero || '',
            complemento: profile.complemento || '',
            bairro: profile.bairro || '',
            cidade: profile.cidade || '',
            uf: profile.uf || '',
            isCarrier: profile.isCarrier || 'no',
        },
    });

    const { control, handleSubmit, watch, trigger, setValue, setError, clearErrors } = methods;

    const processForm = async (data: ProfileFormData) => {
        setIsLoading(true);
        try {
            const storage = getStorage(app);
            const updates: any = {};

            // Upload company logo if provided
            if (data.companyLogo?.[0]) {
                const logoRef = ref(storage, `company-logos/${profile.id}/${data.companyLogo[0].name}`);
                await uploadBytes(logoRef, data.companyLogo[0]);
                updates.photoURL = await getDownloadURL(logoRef);
            }

            // Upload responsible document if provided
            if (data.responsibleDocument?.[0]) {
                const docRef = ref(storage, `company-documents/${profile.id}/responsible/${data.responsibleDocument[0].name}`);
                await uploadBytes(docRef, data.responsibleDocument[0]);
                updates['responsible.document'] = {
                    url: await getDownloadURL(docRef),
                    status: 'pending',
                    uploadedAt: new Date(),
                };
            }

            // Upload CNPJ card if provided
            if (data.cnpjCard?.[0]) {
                const cnpjRef = ref(storage, `company-documents/${profile.id}/cnpj/${data.cnpjCard[0].name}`);
                await uploadBytes(cnpjRef, data.cnpjCard[0]);
                updates['cnpjCard'] = {
                    url: await getDownloadURL(cnpjRef),
                    status: 'pending',
                    uploadedAt: new Date(),
                };
            }

            // Update other fields
            Object.keys(data).forEach(key => {
                if (key !== 'companyLogo' && key !== 'responsibleDocument' && key !== 'cnpjCard') {
                    updates[key] = data[key as keyof ProfileFormData];
                }
            });

            // Update profile status
            updates.status = 'pending';
            updates.updatedAt = new Date();

            // Update Firestore
            const userRef = doc(db, 'users', profile.id);
            await updateDoc(userRef, updates);

            toast({
                title: 'Perfil atualizado com sucesso!',
                description: 'Seu perfil foi enviado para análise.',
            });

            onUpdate();
        } catch (error: any) {
            console.error('Erro ao atualizar perfil:', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao atualizar perfil',
                description: error.message || 'Ocorreu um erro inesperado.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const nextStep = async () => {
        const fields = steps[currentStep].fields as (keyof ProfileFormData)[];
        let output = await trigger(fields, { shouldFocus: true });
        
        // Custom validation for document step where fields aren't required if already approved
        if (currentStep === 2 && !watch('companyLogo') && profile.photoURL) {
            output = true; // Allow to proceed if logo already exists
        }

        if (currentStep === 3) {
            let docError = false;
            if (profile.responsible?.document?.status !== 'approved' && !watch('responsibleDocument')) {
                 methods.setError('responsibleDocument', { type: 'manual', message: 'Documento do responsável é obrigatório.'});
                 docError = true;
            } else {
                 methods.clearErrors('responsibleDocument');
            }
            if (profile.cnpjCard?.status !== 'approved' && !watch('cnpjCard')) {
                 methods.setError('cnpjCard', { type: 'manual', message: 'Cartão CNPJ é obrigatório.'});
                 docError = true;
            } else {
                methods.clearErrors('cnpjCard');
            }
            // If there's a doc error, prevent proceeding. If no doc error but other errors exist, also prevent.
            if (!output || docError) return;
        } else {
             if (!output) return;
        }

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
    
    const FileInput = ({ name, label, description, isLogo = false, existingFile }: { name: any, label: string, description: string, isLogo?: boolean, existingFile?: {url: string, status?: 'approved' | 'rejected' | 'pending'} }) => {
        const fileList = watch(name);
        const [preview, setPreview] = useState<string | null>(existingFile?.url ? existingFile.url : null);
        
        const isApproved = existingFile?.status === 'approved';
        const isRejected = existingFile?.status === 'rejected';

        useEffect(() => {
            if (fileList && fileList[0]) {
                 const file = fileList[0];
                 if (ACCEPTED_IMAGE_TYPES.includes(file.type)) {
                    const objectUrl = URL.createObjectURL(file);
                    setPreview(objectUrl);
                    return () => URL.revokeObjectURL(objectUrl);
                } else {
                    setPreview(null);
                }
            }
        }, [fileList]);

        const fileName = fileList?.[0]?.name;
        
        if (isApproved && !isLogo) {
            return (
                 <div className="space-y-2">
                    <Label>{label}</Label>
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 text-green-800 rounded-md">
                        <CheckCircle className="h-5 w-5" />
                        <span className="text-sm font-medium">Documento aprovado.</span>
                    </div>
                </div>
            )
        }
        
        return (
             <div className="space-y-2">
                {isRejected && !isLogo && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Documento Recusado</AlertTitle>
                        <p className="text-xs">O arquivo anterior foi recusado. Por favor, envie um novo documento válido.</p>
                    </Alert>
                )}
                 <FormField
                    control={control}
                    name={name}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{label}</FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <label htmlFor={name} className={cn("relative flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/75", preview ? "h-48" : "h-32")}>
                                        {preview ? (
                                            <Image src={preview} alt="Pré-visualização" fill objectFit="contain" className="rounded-lg p-2" />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                <UploadCloud className="w-8 h-8 mb-4 text-muted-foreground" />
                                                <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Clique para enviar</span> ou arraste e solte</p>
                                                <p className="text-xs text-muted-foreground">{description}</p>
                                            </div>
                                        )}
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
                             {fileName && !preview && (
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
             </div>
        )
    }

    const getInitials = (name: string) => {
        if (!name) return '';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    }
    
    const getDocStatusLabel = (status?: string) => {
        switch(status) {
            case 'approved': return 'Aprovado';
            case 'rejected': return 'Recusado';
            case 'pending':
            default: return 'Pendente';
        }
    };
    
    const getDocStatusIcon = (status?: string) => {
        switch(status) {
            case 'approved': return <ThumbsUp className="h-4 w-4 text-green-500" />;
            case 'rejected': return <ThumbsDown className="h-4 w-4 text-destructive" />;
            case 'pending':
            default: return <CircleHelp className="h-4 w-4 text-yellow-500" />;
        }
    };
    
    const getDocumentProps = (docData: any) => {
      if (typeof docData === 'string') {
          return { url: docData, status: 'pending' };
      }
      return { url: docData?.url, status: docData?.status || 'pending' };
  }
  
  const responsibleDocumentProps = getDocumentProps(profile.responsible?.document);
  const cnpjCardProps = getDocumentProps(profile.cnpjCard);

    // Final view after completing the form or if profile is active
    if (currentStep === 5) {
        return (
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row items-start gap-6">
                        <Avatar className="h-24 w-24 border-2 border-primary">
                            <AvatarImage src={profile.photoURL ?? ''} alt={profile.name} />
                            <AvatarFallback>{getInitials(profile.name)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 pt-2">
                             <CardTitle className="text-2xl">{profile.tradingName || profile.name}</CardTitle>
                             <CardDescription>{profile.name}</CardDescription>
                              <div className="flex items-center gap-2 mt-2">
                                 <FileText className="h-4 w-4 text-muted-foreground" />
                                 <span className="text-sm text-muted-foreground">{profile.cnpj}</span>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                     <Separator />
                     <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Contato e Endereço</h3>
                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-3">
                                <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span>{profile.email}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span>{profile.address}</span>
                            </div>
                        </div>
                     </div>

                      <Separator />
                     <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Responsável Legal</h3>
                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                             <div className="flex items-center gap-3">
                                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span>{profile.responsible?.name || 'Não informado'}</span>
                            </div>
                             <div className="flex items-center gap-3">
                                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span>CPF: {profile.responsible?.cpf || 'Não informado'}</span>
                            </div>
                        </div>
                     </div>

                    <Separator />
                     <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            Documentos Enviados
                        </h3>
                        <div className="space-y-4">
                            {responsibleDocumentProps.url ? (
                                 <div className="flex flex-wrap items-center justify-between gap-2 p-3 border rounded-md">
                                    <div className='flex items-center gap-2'>
                                        {getDocStatusIcon(responsibleDocumentProps.status)}
                                        <span className={cn('font-medium text-sm', {'text-muted-foreground line-through': responsibleDocumentProps.status === 'rejected'})}>
                                            Documento do Responsável
                                        </span>
                                         <Badge variant="outline" className="capitalize">{getDocStatusLabel(responsibleDocumentProps.status)}</Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <a href={responsibleDocumentProps.url} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
                                            <ExternalLink className="mr-2 h-4 w-4" /> Ver
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">Documento do Responsável não enviado.</p>
                            )}
                            {cnpjCardProps.url ? (
                                 <div className="flex flex-wrap items-center justify-between gap-2 p-3 border rounded-md">
                                     <div className='flex items-center gap-2'>
                                        {getDocStatusIcon(cnpjCardProps.status)}
                                        <span className={cn('font-medium text-sm', {'text-muted-foreground line-through': cnpjCardProps.status === 'rejected'})}>
                                            Cartão CNPJ
                                        </span>
                                         <Badge variant="outline" className="capitalize">{getDocStatusLabel(cnpjCardProps.status)}</Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                         <a href={cnpjCardProps.url} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
                                            <ExternalLink className="mr-2 h-4 w-4" /> Ver
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">Cartão CNPJ não enviado.</p>
                            )}
                             {!responsibleDocumentProps.url && !cnpjCardProps.url && (
                                 <p className="text-muted-foreground text-sm">Nenhum documento enviado.</p>
                             )}
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={() => setCurrentStep(0)}>Editar Perfil</Button>
                </CardFooter>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{profile.status === 'incomplete' ? 'Complete seu Perfil' : 'Editar Perfil'}</CardTitle>
                <CardDescription>
                    {profile.status === 'incomplete' 
                        ? 'Para garantir a segurança da plataforma, precisamos de mais algumas informações.' 
                        : 'Mantenha as informações da sua empresa sempre atualizadas.'
                    }
                </CardDescription>
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
                            <div className="grid md:grid-cols-2 gap-4">
                                <FormField
                                    control={control}
                                    name="cep"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>CEP</FormLabel>
                                            <FormControl><Input {...field} placeholder="00000-000" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={control}
                                    name="logradouro"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Logradouro</FormLabel>
                                            <FormControl><Input {...field} placeholder="Rua, Avenida, etc." /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="grid md:grid-cols-3 gap-4">
                                <FormField
                                    control={control}
                                    name="numero"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Número</FormLabel>
                                            <FormControl><Input {...field} placeholder="123" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={control}
                                    name="complemento"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Complemento</FormLabel>
                                            <FormControl><Input {...field} placeholder="Apto, Sala, etc." /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={control}
                                    name="bairro"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Bairro</FormLabel>
                                            <FormControl><Input {...field} placeholder="Centro" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                                <FormField
                                    control={control}
                                    name="cidade"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Cidade</FormLabel>
                                            <FormControl><Input {...field} placeholder="São Paulo" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={control}
                                    name="uf"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>UF</FormLabel>
                                            <FormControl><Input {...field} placeholder="SP" maxLength={2} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* ETAPA 3 */}
                        <div className={cn("space-y-6", currentStep !== 2 && "hidden")}>
                            <FormField
                                control={control}
                                name="companyLogo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Logo da Empresa</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <label htmlFor="companyLogo" className={cn("relative flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/75", profile.photoURL ? "h-48" : "h-32")}>
                                                    {profile.photoURL ? (
                                                        <Image src={profile.photoURL} alt="Logo atual" fill objectFit="contain" className="rounded-lg p-2" />
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                            <UploadCloud className="w-8 h-8 mb-4 text-muted-foreground" />
                                                            <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Clique para enviar</span> ou arraste e solte</p>
                                                            <p className="text-xs text-muted-foreground">PNG, JPG até 5MB</p>
                                                        </div>
                                                    )}
                                                    <Input 
                                                        id="companyLogo" 
                                                        type="file" 
                                                        className="hidden"
                                                        onBlur={field.onBlur}
                                                        name={field.name}
                                                        onChange={(e) => field.onChange(e.target.files)}
                                                    />
                                                </label>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* ETAPA 4 */}
                        <div className={cn("space-y-6", currentStep !== 3 && "hidden")}>
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Documentos Necessários</h3>
                                <p className="text-sm text-muted-foreground">Para garantir a segurança da plataforma, precisamos dos seguintes documentos:</p>
                            </div>
                            
                            <FileInput 
                                name="responsibleDocument" 
                                label="Documento do Responsável Legal" 
                                description="RG, CNH ou Passaporte (PDF, JPG, PNG até 5MB)"
                                existingFile={profile.responsible?.document}
                            />
                            
                            <FileInput 
                                name="cnpjCard" 
                                label="Cartão CNPJ" 
                                description="Cartão CNPJ da empresa (PDF, JPG, PNG até 5MB)"
                                existingFile={profile.cnpjCard}
                            />
                        </div>

                        {/* ETAPA 5 */}
                        <div className={cn("space-y-6", currentStep !== 4 && "hidden")}>
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Finalização</h3>
                                <p className="text-sm text-muted-foreground">Últimas informações para completar seu perfil:</p>
                            </div>
                            
                            <FormField
                                control={control}
                                name="isCarrier"
                                render={({ field }) => (
                                    <FormItem className="space-y-3">
                                        <FormLabel className="text-base">Sua empresa atua como transportadora?</FormLabel>
                                        <FormControl>
                                            <RadioGroup
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                                className="flex flex-col space-y-1"
                                            >
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                    <FormControl>
                                                        <RadioGroupItem value="yes" />
                                                    </FormControl>
                                                    <div className="space-y-1 leading-none">
                                                        <FormLabel className="font-normal">
                                                            Sim, somos transportadores
                                                        </FormLabel>
                                                        <FormDescription>
                                                            Sua empresa oferece serviços de transporte de cargas
                                                        </FormDescription>
                                                    </div>
                                                </FormItem>
                                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                    <FormControl>
                                                        <RadioGroupItem value="no" />
                                                    </FormControl>
                                                    <div className="space-y-1 leading-none">
                                                        <FormLabel className="font-normal">
                                                            Não, somos apenas contratantes
                                                        </FormLabel>
                                                        <FormDescription>
                                                            Sua empresa contrata serviços de transporte
                                                        </FormDescription>
                                                    </div>
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

