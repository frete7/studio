
'use client';

import { useState, useEffect } from 'react';
import { useForm, FormProvider, useFormContext, Controller, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db, app } from '@/lib/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Truck, Loader2, Calendar as CalendarIcon, UploadCloud, FileText, CheckCircle, PlusCircle, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import Image from 'next/image';
import { type BodyType, type VehicleType } from '@/app/actions';

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
  
const optionalFileSchema = (types: string[]) => z.any()
    .optional()
    .refine((files) => !files || files.length === 0 || files[0].size <= MAX_FILE_SIZE, `Tamanho máximo é 5MB.`)
    .refine((files) => !files || files.length === 0 || types.includes(files[0].type), `Formato inválido. Tipos aceitos: ${types.join(", ")}`);


const vehicleSchema = z.object({
    brand: z.string().min(2, "Marca é obrigatória."),
    model: z.string().min(2, "Modelo é obrigatório."),
    year: z.string().length(4, "Ano inválido."),
    color: z.string().min(2, "Cor é obrigatória."),
    licensePlate: z.string().min(7, "Placa inválida."),
    vehicleTypeId: z.string({ required_error: "Selecione o tipo de veículo." }),
    bodyTypeId: z.string({ required_error: "Selecione o tipo de carroceria." }),
    crlvFile: optionalFileSchema(ACCEPTED_DOC_TYPES),
    frontPhoto: optionalFileSchema(ACCEPTED_IMG_TYPES),
    sidePhoto: optionalFileSchema(ACCEPTED_IMG_TYPES),
});

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
  rntrc: z.string().optional(),

  // Step 3
  selfie: optionalFileSchema(ACCEPTED_IMG_TYPES),
  cnhFile: optionalFileSchema(ACCEPTED_DOC_TYPES),
  cnhCategory: z.string({ required_error: "Categoria da CNH é obrigatória." }),
  cnhNumber: z.string().min(5, "Número da CNH inválido."),
  cnhExpiration: z.date({ required_error: "Data de vencimento é obrigatória."}),

  // Step 4
  vehicles: z.array(vehicleSchema)
    .min(1, "Você deve adicionar pelo menos um veículo.")
    .refine((vehicles) => {
        const licensePlates = vehicles.map(v => v.licensePlate);
        return new Set(licensePlates).size === licensePlates.length;
    }, {
        message: "Placas de veículo duplicadas não são permitidas.",
    }),
  
  // Step 5
  email: z.string().email("Email inválido."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
  confirmPassword: z.string(),

}).refine(data => data.phone === data.confirmPhone, {
    message: "Os telefones não coincidem.",
    path: ["confirmPhone"],
}).refine(data => !data.hasCnpj || (data.cnpj && data.cnpj.length === 18), {
    message: "CNPJ é obrigatório e deve ser válido.",
    path: ["cnpj"],
}).refine(data => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
});


type DriverFormData = z.infer<typeof formSchema>;

const steps = [
    { id: 1, name: 'Dados Pessoais', fields: ['fullName', 'birthDate', 'cpf', 'phone', 'confirmPhone'] },
    { id: 2, name: 'Endereço e Profissional', fields: ['cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf', 'addressManual', 'hasCnpj', 'cnpj', 'issuesInvoice', 'issuesCte', 'hasAntt', 'rntrc'] },
    { id: 3, name: 'Documentos', fields: ['selfie', 'cnhFile', 'cnhCategory', 'cnhNumber', 'cnhExpiration'] },
    { id: 4, name: 'Veículos', fields: ['vehicles'] },
    { id: 5, name: 'Acesso', fields: ['email', 'password', 'confirmPassword'] },
];

const storage = getStorage(app);

// ==================================
// FORM COMPONENT
// ==================================
export default function DriverRegisterForm({ allVehicleTypes, allBodyTypes }: { allVehicleTypes: VehicleType[], allBodyTypes: BodyType[] }) {
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
      vehicles: [],
      email: '',
      password: '',
      confirmPassword: '',
    }
  });

  const { handleSubmit, trigger, getValues, setError } = methods;

  const uploadFile = async (file: File, path: string): Promise<{url: string, status: 'pending'}> => {
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    return { url, status: 'pending' };
  };


  const processForm = async (data: DriverFormData) => {
    setIsLoading(true);
    try {
        // 1. Create user in Auth
        const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        const user = userCredential.user;

        // 2. Upload files and create data structure with status
        const selfieUrl = data.selfie?.[0] ? await uploadFile(data.selfie[0], `users/${user.uid}/selfie`) : null;
        const cnhFileUrl = data.cnhFile?.[0] ? await uploadFile(data.cnhFile[0], `users/${user.uid}/cnh`) : null;

        const vehicleUploadPromises = data.vehicles.map(async (vehicle, index) => {
            const plate = vehicle.licensePlate.replace(/[^A-Z0-9]/g, '');
            const crlvUrl = vehicle.crlvFile?.[0] ? await uploadFile(vehicle.crlvFile[0], `users/${user.uid}/vehicles/${plate}/crlv`) : null;
            const frontPhotoUrl = vehicle.frontPhoto?.[0] ? await uploadFile(vehicle.frontPhoto[0], `users/${user.uid}/vehicles/${plate}/front`) : null;
            const sidePhotoUrl = vehicle.sidePhoto?.[0] ? await uploadFile(vehicle.sidePhoto[0], `users/${user.uid}/vehicles/${plate}/side`) : null;
            
            return {
                ...vehicle,
                crlvFile: crlvUrl,
                frontPhoto: frontPhotoUrl,
                sidePhoto: sidePhotoUrl,
            };
        });
        
        const uploadedVehicles = await Promise.all(vehicleUploadPromises);

        // 3. Prepare data for Firestore
        const { confirmPassword, password, confirmPhone, ...formData } = data;
        
        const firestoreData = {
            ...formData,
            uid: user.uid,
            email: user.email,
            selfie: selfieUrl,
            cnhFile: cnhFileUrl,
            vehicles: uploadedVehicles,
            role: 'driver',
            status: 'pending', // Overall status starts as pending
            createdAt: serverTimestamp(),
        };

        // 4. Save to Firestore
        await setDoc(doc(db, 'users', user.uid), firestoreData);
        
        toast({
            title: "Cadastro Finalizado!",
            description: "Seu perfil foi enviado para análise. Você será notificado em breve.",
        });
        
        router.push('/driver-dashboard');
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Erro no Cadastro",
            description: error.code === 'auth/email-already-in-use' ? 'Este e-mail já está em uso.' : error.message,
        });
    } finally {
        setIsLoading(false);
    }
  };
  
  type FieldName = keyof DriverFormData;

  const nextStep = async () => {
    const fields = steps[currentStep].fields as FieldName[];
    const output = await trigger(fields, { shouldFocus: true });
    
    if (!output) return;

    if (currentStep === 0) {
        setIsLoading(true);
        const cpf = getValues('cpf');
        const q = query(collection(db, "users"), where("cpf", "==", cpf));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            setError('cpf', { type: 'manual', message: 'Este CPF já está cadastrado.' });
            setIsLoading(false);
            return;
        }
        setIsLoading(false);
    }
    
     if (currentStep === 2) { // Document Step
        if (!getValues('selfie') || getValues('selfie').length === 0) {
            setError('selfie', { type: 'manual', message: 'A selfie é obrigatória.'});
            return;
        }
         if (!getValues('cnhFile') || getValues('cnhFile').length === 0) {
            setError('cnhFile', { type: 'manual', message: 'O arquivo da CNH é obrigatório.'});
            return;
        }
    }
    
     if (currentStep === 3) { // Vehicle Step
        const vehicles = getValues('vehicles');
        let hasError = false;
        vehicles.forEach((vehicle, index) => {
            if (!vehicle.crlvFile || vehicle.crlvFile.length === 0) {
                setError(`vehicles.${index}.crlvFile`, {type: 'manual', message: 'CRLV é obrigatório.'});
                hasError = true;
            }
             if (!vehicle.frontPhoto || vehicle.frontPhoto.length === 0) {
                setError(`vehicles.${index}.frontPhoto`, {type: 'manual', message: 'Foto frontal é obrigatória.'});
                hasError = true;
            }
             if (!vehicle.sidePhoto || vehicle.sidePhoto.length === 0) {
                setError(`vehicles.${index}.sidePhoto`, {type: 'manual', message: 'Foto lateral é obrigatória.'});
                hasError = true;
            }
        });
        if(hasError) return;
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
              {currentStep === 3 && <Step4 allVehicleTypes={allVehicleTypes} allBodyTypes={allBodyTypes} />}
              {currentStep === 4 && <Step5 />}
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
    
    const toTitleCase = (str: string) => {
      return str.replace(
        /\w\S*/g,
        (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      );
    };
    
    return (
        <div className="space-y-6">
            <FormField control={control} name="fullName" render={({ field }) => (
                <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                        <Input 
                            placeholder="Seu nome completo" 
                            {...field}
                            onChange={(e) => field.onChange(toTitleCase(e.target.value))}
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )} />
            <div className="grid md:grid-cols-2 gap-4">
                 <FormField control={control} name="birthDate" render={({ field }) => (
                     <FormItem className="flex flex-col"><FormLabel>Data de Nascimento</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}><>{field.value ? (format(field.value, "dd/MM/yyyy")) : (<span>Escolha uma data</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar locale={ptBR} mode="single" selected={field.value} onSelect={field.onChange} captionLayout="dropdown-buttons" fromYear={1950} toYear={new Date().getFullYear() - 18} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                 )} />
                 <FormField control={control} name="cpf" render={({ field }) => (
                     <FormItem><FormLabel>CPF</FormLabel><FormControl><Input placeholder="000.000.000-00" {...field} onChange={(e) => field.onChange(handleMask(e.target.value, 'cpf'))} /></FormControl><FormMessage>{errors.cpf && typeof errors.cpf.message === 'string' && errors.cpf.message}</FormMessage></FormItem>
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
    );
};

const Step2 = () => {
    const { control, setValue, setFocus } = useFormContext();
    const [isCepLoading, setIsCepLoading] = useState(false);
    const { toast } = useToast();

    const isManualAddress = useWatch({ control, name: 'addressManual' });
    const hasCnpj = useWatch({ control, name: 'hasCnpj' });
    const hasAntt = useWatch({ control, name: 'hasAntt' });

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
             {hasAntt && <FormField control={control} name="rntrc" render={({ field }) => (<FormItem><FormLabel>RNTRC</FormLabel><FormControl><Input placeholder="Número do RNTRC" {...field} /></FormControl><FormMessage /></FormItem>)} />}
        </div>
    );
};

const FileInput = ({ name, label, description, acceptedTypes, captureMode }: { name: any, label: string, description: string, acceptedTypes: string[], captureMode?: 'user' | 'environment' }) => {
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
        } else {
             setPreview(null);
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
                                <Input 
                                    id={name} 
                                    type="file" 
                                    className="hidden" 
                                    accept={acceptedTypes.join(',')} 
                                    capture={captureMode}
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
    )
};

const Step3 = () => {
    const { control } = useFormContext();
    const cnhCategories = ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'];

    return (
        <div className="space-y-6">
            <FileInput name="selfie" label="Selfie do Rosto" description="PNG, JPG, WEBP (MAX 5MB)" acceptedTypes={ACCEPTED_IMG_TYPES} captureMode="user" />
            <FileInput name="cnhFile" label="Foto da CNH (Frente e Verso) ou PDF" description="PNG, JPG, PDF (MAX 5MB)" acceptedTypes={ACCEPTED_DOC_TYPES} />
            <FormField control={control} name="cnhCategory" render={({ field }) => (
                <FormItem><FormLabel>Categoria da CNH</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger></FormControl><SelectContent>{cnhCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
            )} />
            <div className="grid md:grid-cols-2 gap-4">
                 <FormField control={control} name="cnhNumber" render={({ field }) => (
                    <FormItem><FormLabel>Número de Registro da CNH</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={control} name="cnhExpiration" render={({ field }) => (
                     <FormItem className="flex flex-col"><FormLabel>Data de Vencimento da CNH</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}><>{field.value ? (format(field.value, "dd/MM/yyyy")) : (<span>Escolha uma data</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar locale={ptBR} mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date()} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                 )} />
            </div>
        </div>
    );
};

const Step4 = ({ allVehicleTypes, allBodyTypes }: { allVehicleTypes: VehicleType[], allBodyTypes: BodyType[] }) => {
    const { control, formState: { errors } } = useFormContext();
    const { fields, append, remove } = useFieldArray({
        control,
        name: "vehicles",
    });

    const yearOptions = Array.from({ length: 60 }, (_, i) => (new Date().getFullYear() - i).toString());

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-semibold">4. Cadastro de Veículos</h2>
            <p className="text-muted-foreground">Adicione um ou mais veículos que você utiliza para os fretes.</p>
            <Separator />
            <div className="space-y-6">
                {fields.map((field, index) => (
                    <Card key={field.id} className="p-4 bg-muted/30 relative">
                        <div className="flex justify-between items-center mb-4">
                             <h3 className="text-lg font-medium">Veículo {index + 1}</h3>
                             <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => remove(index)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                             <FormField control={control} name={`vehicles.${index}.brand`} render={({ field }) => (<FormItem><FormLabel>Marca</FormLabel><FormControl><Input placeholder="Ex: Scania" {...field} /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={control} name={`vehicles.${index}.model`} render={({ field }) => (<FormItem><FormLabel>Modelo</FormLabel><FormControl><Input placeholder="Ex: R450" {...field} /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={control} name={`vehicles.${index}.year`} render={({ field }) => (<FormItem><FormLabel>Ano</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl><SelectContent>{yearOptions.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                             <FormField control={control} name={`vehicles.${index}.color`} render={({ field }) => (<FormItem><FormLabel>Cor</FormLabel><FormControl><Input placeholder="Ex: Branco" {...field} /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={control} name={`vehicles.${index}.licensePlate`} render={({ field }) => (<FormItem><FormLabel>Placa</FormLabel><FormControl><Input placeholder="BRA2E19" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 mt-4">
                             <FormField control={control} name={`vehicles.${index}.vehicleTypeId`} render={({ field }) => (<FormItem><FormLabel>Tipo de Veículo</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl><SelectContent>{allVehicleTypes.map(vt => <SelectItem key={vt.id} value={vt.id}>{vt.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                             <FormField control={control} name={`vehicles.${index}.bodyTypeId`} render={({ field }) => (<FormItem><FormLabel>Tipo de Carroceria</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl><SelectContent>{allBodyTypes.map(bt => <SelectItem key={bt.id} value={bt.id}>{bt.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                        </div>
                        <div className="mt-4 space-y-4">
                             <FileInput name={`vehicles.${index}.crlvFile`} label="CRLV" description="Imagem ou PDF" acceptedTypes={ACCEPTED_DOC_TYPES} />
                             <FileInput name={`vehicles.${index}.frontPhoto`} label="Foto Frontal" description="Imagem do veículo" acceptedTypes={ACCEPTED_IMG_TYPES} captureMode="environment" />
                             <FileInput name={`vehicles.${index}.sidePhoto`} label="Foto Lateral" description="Imagem do veículo" acceptedTypes={ACCEPTED_IMG_TYPES} captureMode="environment" />
                        </div>
                    </Card>
                ))}
            </div>
            <Button type="button" variant="outline" className="w-full" onClick={() => append({ brand: '', model: '', year: '', color: '', licensePlate: '', vehicleTypeId: '', bodyTypeId: '', crlvFile: undefined, frontPhoto: undefined, sidePhoto: undefined })}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar outro veículo
            </Button>
            <FormMessage>
                {typeof errors.vehicles === 'object' && !Array.isArray(errors.vehicles) && errors.vehicles?.root?.message}
            </FormMessage>
        </div>
    );
};

const Step5 = () => {
    const { control, getValues } = useFormContext();
     const { toast } = useToast();

     const handleCheckEmail = async () => {
        const email = getValues('email');
        if (!email || !z.string().email().safeParse(email).success) {
            toast({ variant: 'destructive', title: 'Email inválido', description: 'Por favor, insira um email válido para verificar.' });
            return;
        }

        const q = query(collection(db, "users"), where("email", "==", email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            toast({ variant: 'destructive', title: 'Email já cadastrado', description: 'Este email já está em uso. Por favor, use outro.' });
        } else {
             toast({ title: 'Email disponível', description: 'Você pode usar este email para o cadastro.' });
        }
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-semibold">5. Acesso à Plataforma</h2>
            <p className="text-muted-foreground">Crie suas credenciais para acessar sua conta.</p>
            <Separator />
            <FormField
                control={control}
                name="email"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Email</FormLabel>
                        <div className="flex gap-2">
                             <FormControl><Input type="email" placeholder="seu@email.com" {...field} /></FormControl>
                             <Button type="button" variant="outline" onClick={handleCheckEmail}>Verificar</Button>
                        </div>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <div className="grid md:grid-cols-2 gap-4">
                <FormField
                    control={control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Senha</FormLabel>
                            <FormControl><Input type="password" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={control}
                    name="confirmPassword"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Confirmar Senha</FormLabel>
                            <FormControl><Input type="password" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
             <div className="mt-4 text-center text-sm">
                Já tem uma conta?{' '}
                <Link href="/login" className="font-semibold text-primary hover:underline">
                Faça login
                </Link>
            </div>
        </div>
    );
}
