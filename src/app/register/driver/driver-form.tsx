
'use client';

import { useState, useEffect } from 'react';
import { useForm, FormProvider, useFormContext, Controller, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, app } from '@/lib/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Truck, Loader2, Calendar as CalendarIcon, UploadCloud, FileText, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { addYears, format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import Image from 'next/image';

// ==================================
// SCHEMAS & UTILS
// ==================================

function validateCPF(cpf: string) {
    if (!cpf) return false;
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false;
    const digits = cpf.split('').map(Number);
    const validator = (n: number) => (digits.slice(0, n).reduce((sum, digit, index) => sum + digit * (n + 1 - index), 0) * 10) % 11 % 10;
    return validator(9) === digits[9] && validator(10) === digits[10];
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_DOC_TYPES = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
const ACCEPTED_IMG_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const fileSchema = (types: string[]) => z.any()
  .refine((files) => files?.[0], "Arquivo é obrigatório.")
  .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, `Tamanho máximo é 5MB.`)
  .refine((files) => types.includes(files?.[0]?.type), `Formato inválido. Tipos aceitos: ${types.join(', ')}.`);

const formSchema = z.object({
  // Step 1
  fullName: z.string().min(3, "Nome completo é obrigatório."),
  birthDate: z.date({ required_error: "Data de nascimento é obrigatória."})
    .refine((date) => {
        const today = new Date();
        const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
        return date <= eighteenYearsAgo;
    }, "Você deve ter pelo menos 18 anos."),
  cpf: z.string().refine(validateCPF, "CPF inválido."),
  phone: z.string().min(15, "Telefone inválido."),
  confirmPhone: z.string().min(15, "Confirmação inválida."),

  // Step 2
  cep: z.string().length(9, 'CEP deve ter 8 números.'),
  logradouro: z.string().min(1, 'Endereço é obrigatório.'),
  numero: z.string().min(1, 'Número é obrigatório.'),
  complemento: z.string().optional(),
  bairro: z.string().min(1, 'Bairro é obrigatório.'),
  cidade: z.string().min(1, 'Cidade é obrigatória.'),
  uf: z.string().min(2, 'UF é obrigatório.'),
  addressManual: z.boolean().default(false),
  hasCnpj: z.boolean().default(false),
  cnpj: z.string().optional(),
  issuesInvoice: z.boolean().default(false),
  issuesCte: z.boolean().default(false),
  hasAntt: z.boolean().default(false),

  // Step 3
  selfie: fileSchema(ACCEPTED_IMG_TYPES),
  cnhFile: fileSchema(ACCEPTED_DOC_TYPES),
  cnhCategory: z.string({ required_error: "Categoria da CNH é obrigatória." }),
  cnhNumber: z.string().min(5, "Número da CNH inválido."),
  cnhExpiration: z.date({ required_error: "Data de vencimento é obrigatória."}),
  
}).refine(data => data.phone === data.confirmPhone, {
    message: "Os telefones não coincidem.",
    path: ["confirmPhone"],
}).refine(data => !data.hasCnpj || (data.cnpj && data.cnpj.length === 18), {
    message: "CNPJ é obrigatório e deve ser válido.",
    path: ["cnpj"],
});

type DriverFormData = z.infer<typeof formSchema>;

const steps = [
    { id: 1, name: 'Dados Pessoais', fields: ['fullName', 'birthDate', 'cpf', 'phone', 'confirmPhone'] },
    { id: 2, name: 'Endereço e Profissional', fields: ['cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf', 'addressManual', 'hasCnpj', 'cnpj', 'issuesInvoice', 'issuesCte', 'hasAntt'] },
    { id: 3, name: 'Documentos', fields: ['selfie', 'cnhFile', 'cnhCategory', 'cnhNumber', 'cnhExpiration'] },
    { id: 4, name: 'Veículos' },
    { id: 5, name: 'Acesso' },
];

const storage = getStorage(app);

// ==================================
// FORM COMPONENT
// ==================================
export default function DriverRegisterForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const methods = useForm<DriverFormData>({
    resolver: zodResolver(formSchema),
    mode: 'onBlur',
    defaultValues: {
      fullName: '',
      cpf: '',
      phone: '',
      confirmPhone: '',
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      uf: '',
      addressManual: false,
      hasCnpj: false,
      cnpj: '',
      issuesInvoice: false,
      issuesCte: false,
      hasAntt: false,
      cnhCategory: undefined,
      cnhNumber: '',
      birthDate: undefined,
      cnhExpiration: undefined,
      selfie: undefined,
      cnhFile: undefined,
    }
  });

  const { handleSubmit, trigger } = methods;

  const processForm = async (data: DriverFormData) => {
    // This will be implemented in the final step
    alert(JSON.stringify(data, null, 2));
  };
  
  type FieldName = keyof DriverFormData;

  const nextStep = async () => {
    const fields = steps[currentStep].fields as FieldName[];
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

  return (
    <div className="flex min-h-[calc(100vh-128px)] items-center justify-center bg-muted/40 px-4 py-12">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Truck className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Cadastro de Motorista</CardTitle>
          </div>
          <CardDescription>Siga as etapas para criar seu perfil de motorista.</CardDescription>
          <Separator />
           <div className="pt-4">
                <p className="text-sm text-muted-foreground">Etapa {currentStep + 1} de {steps.length}: {steps[currentStep].name}</p>
                <Progress value={progress} className="mt-2" />
            </div>
        </CardHeader>
        <CardContent>
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(processForm)} className="space-y-6">
              {currentStep === 0 && <Step1 />}
              {currentStep === 1 && <Step2 />}
              {currentStep === 2 && <Step3 />}
              {/* Steps 4 and 5 will be added later */}
               {currentStep > 2 && <p>Próximas etapas em construção...</p>}
            </form>
          </FormProvider>
          <div className="mt-8 flex justify-between">
            <Button onClick={prevStep} variant="outline" disabled={currentStep === 0 || isLoading}>
              Voltar
            </Button>
            <Button onClick={nextStep} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {currentStep === steps.length - 1 ? 'Finalizar Cadastro' : 'Próximo'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================================
// STEP COMPONENTS
// ==================================

const Step1 = () => {
    const { control, formState: { errors } } = useFormContext();

    const handleMask = (value: string, maskType: 'cpf' | 'phone') => {
        const unmasked = value.replace(/\D/g, '');
        if (maskType === 'cpf') {
        return unmasked
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
            .substring(0, 14);
        }
        if (maskType === 'phone') {
            return unmasked
            .replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{5})(\d)/, '$1-$2')
            .substring(0, 15);
        }
        return value;
    };
    
    return (
        <div className="space-y-6">
            <FormField control={control} name="fullName" render={({ field }) => (
                <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl><Input placeholder="Seu nome completo" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />
            <div className="grid md:grid-cols-2 gap-4">
                 <FormField control={control} name="birthDate" render={({ field }) => (
                     <FormItem className="flex flex-col"><FormLabel>Data de Nascimento</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}><>{field.value ? (format(field.value, "dd/MM/yyyy")) : (<span>Escolha uma data</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} captionLayout="dropdown-buttons" fromYear={1950} toYear={new Date().getFullYear() - 18} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                 )} />
                 <FormField control={control} name="cpf" render={({ field }) => (
                     <FormItem><FormLabel>CPF</FormLabel><FormControl><Input placeholder="000.000.000-00" {...field} onChange={(e) => field.onChange(handleMask(e.target.value, 'cpf'))} /></FormControl><FormMessage /></FormItem>
                 )} />
            </div>
             <div className="grid md:grid-cols-2 gap-4">
                 <FormField control={control} name="phone" render={({ field }) => (
                     <FormItem><FormLabel>Telefone (com DDD)</FormLabel><FormControl><Input placeholder="(00) 00000-0000" {...field} onChange={(e) => field.onChange(handleMask(e.target.value, 'phone'))} /></FormControl><FormMessage /></FormItem>
                 )} />
                  <FormField control={control} name="confirmPhone" render={({ field }) => (
                     <FormItem><FormLabel>Confirmar Telefone</FormLabel><FormControl><Input placeholder="(00) 00000-0000" {...field} onChange={(e) => field.onChange(handleMask(e.target.value, 'phone'))} /></FormControl><FormMessage /></FormItem>
                 )} />
             </div>
        </div>
    )
}

const Step2 = () => {
    const { control, setValue, setFocus } = useFormContext();
    const [isCepLoading, setIsCepLoading] = useState(false);
    const { toast } = useToast();

    const isManualAddress = useWatch({ control, name: 'addressManual' });
    const hasCnpj = useWatch({ control, name: 'hasCnpj' });

    const handleCepBlur = async (cep: string) => {
        const cleanCep = cep.replace(/\D/g, '');
        if (cleanCep.length !== 8) return;

        setIsCepLoading(true);
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const data = await response.json();
            if (data.erro) {
                toast({ variant: 'destructive', title: 'CEP não encontrado.' });
                return;
            }
            setValue('logradouro', data.logradouro, { shouldValidate: true });
            setValue('bairro', data.bairro, { shouldValidate: true });
            setValue('cidade', data.localidade, { shouldValidate: true });
            setValue('uf', data.uf, { shouldValidate: true });
            setFocus('numero');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao buscar CEP.' });
        } finally {
            setIsCepLoading(false);
        }
    };
    
    return (
        <div className="space-y-6">
             <div className="grid md:grid-cols-3 gap-4">
                <FormField control={control} name="cep" render={({ field }) => (
                    <FormItem><FormLabel>CEP</FormLabel><FormControl><div className="relative"><Input placeholder="00000-000" {...field} onBlur={() => handleCepBlur(field.value)} disabled={isManualAddress} />{isCepLoading && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin" />}</div></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={control} name="uf" render={({ field }) => (<FormItem><FormLabel>UF</FormLabel><FormControl><Input {...field} readOnly={!isManualAddress} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={control} name="cidade" render={({ field }) => (<FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} readOnly={!isManualAddress} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <FormField control={control} name="logradouro" render={({ field }) => (<FormItem><FormLabel>Logradouro</FormLabel><FormControl><Input {...field} readOnly={!isManualAddress} /></FormControl><FormMessage /></FormItem>)} />
             <div className="grid md:grid-cols-3 gap-4">
                <FormField control={control} name="bairro" render={({ field }) => (<FormItem className="col-span-2"><FormLabel>Bairro</FormLabel><FormControl><Input {...field} readOnly={!isManualAddress} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={control} name="numero" render={({ field }) => (<FormItem><FormLabel>Número</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
             <FormField control={control} name="complemento" render={({ field }) => (<FormItem><FormLabel>Complemento (Opcional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={control} name="addressManual" render={({ field }) => (<FormItem className="flex flex-row items-center space-x-2"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>Não achei meu CEP, digitar manualmente</FormLabel></FormItem>)} />
            
            <Separator />
            
            <FormField control={control} name="hasCnpj" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5"><FormLabel>Você possui CNPJ?</FormLabel></div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
            )} />
            {hasCnpj && <FormField control={control} name="cnpj" render={({ field }) => (<FormItem><FormLabel>CNPJ</FormLabel><FormControl><Input placeholder="00.000.000/0000-00" {...field} /></FormControl><FormMessage /></FormItem>)} />}
            
            <FormField control={control} name="issuesInvoice" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel>Emite Nota Fiscal?</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
            <FormField control={control} name="issuesCte" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel>Emite CT-e (Conhecimento de Transporte Eletrônico)?</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
            <FormField control={control} name="hasAntt" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-4"><div className="space-y-0.5"><FormLabel>Possui ANTT (Agência Nacional de Transportes Terrestres)?</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />
        </div>
    )
}

const FileInput = ({ name, label, description, acceptedTypes }: { name: any, label: string, description: string, acceptedTypes: string[] }) => {
    const { control, watch } = useFormContext();
    const fileList = watch(name);
    const [preview, setPreview] = useState<string | null>(null);

    useEffect(() => {
        if (fileList && fileList[0]) {
            const file = fileList[0];
            if (ACCEPTED_IMG_TYPES.includes(file.type)) {
                const objectUrl = URL.createObjectURL(file);
                setPreview(objectUrl);
                return () => URL.revokeObjectURL(objectUrl);
            } else {
                setPreview(null);
            }
        }
    }, [fileList]);
    
    const fileName = fileList?.[0]?.name;

    return (
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
                                    <Image src={preview} alt="Pré-visualização" fill style={{ objectFit: 'contain' }} className="rounded-lg p-2" />
                                ) : (
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <UploadCloud className="w-8 h-8 mb-4 text-muted-foreground" />
                                        <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Clique para enviar</span> ou arraste e solte</p>
                                        <p className="text-xs text-muted-foreground">{description}</p>
                                    </div>
                                )}
                                <Input id={name} type="file" className="hidden" accept={acceptedTypes.join(',')} onBlur={field.onBlur} name={field.name} onChange={(e) => field.onChange(e.target.files)} />
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
    )
}

const Step3 = () => {
    const { control } = useFormContext();
    const cnhCategories = ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'];

    return (
        <div className="space-y-6">
            <FileInput name="selfie" label="Selfie do Rosto" description="PNG, JPG, WEBP (MAX 5MB)" acceptedTypes={ACCEPTED_IMG_TYPES} />
            <FileInput name="cnhFile" label="Foto da CNH (Frente e Verso) ou PDF" description="PNG, JPG, PDF (MAX 5MB)" acceptedTypes={ACCEPTED_DOC_TYPES} />
            <FormField control={control} name="cnhCategory" render={({ field }) => (
                <FormItem><FormLabel>Categoria da CNH</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger></FormControl><SelectContent>{cnhCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
            )} />
            <div className="grid md:grid-cols-2 gap-4">
                 <FormField control={control} name="cnhNumber" render={({ field }) => (
                    <FormItem><FormLabel>Número de Registro da CNH</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={control} name="cnhExpiration" render={({ field }) => (
                     <FormItem className="flex flex-col"><FormLabel>Data de Vencimento da CNH</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}><>{field.value ? (format(field.value, "dd/MM/yyyy")) : (<span>Escolha uma data</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date()} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                 )} />
            </div>
        </div>
    )
}
