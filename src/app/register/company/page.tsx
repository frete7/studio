
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Building, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

const companyFormSchema = z.object({
  cnpj: z.string().length(18, 'CNPJ deve ter 14 números.'),
  razaoSocial: z.string().min(3, 'Razão Social é obrigatória.'),
  nomeFantasia: z.string().min(3, 'Nome Fantasia é obrigatório.'),
  cep: z.string().length(9, 'CEP deve ter 8 números.'),
  logradouro: z.string().min(1, 'Endereço é obrigatório.'),
  numero: z.string().min(1, 'Número é obrigatório.'),
  complemento: z.string().optional(),
  bairro: z.string().min(1, 'Bairro é obrigatório.'),
  cidade: z.string().min(1, 'Cidade é obrigatória.'),
  uf: z.string().min(2, 'UF é obrigatório.'),
  email: z.string().email('Email inválido.'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres.'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem.',
  path: ['confirmPassword'],
});

type CompanyFormData = z.infer<typeof companyFormSchema>;

export default function CompanyRegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isCepLoading, setIsCepLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companyFormSchema),
    mode: 'onBlur',
    defaultValues: {
        cnpj: '',
        razaoSocial: '',
        nomeFantasia: '',
        cep: '',
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        uf: '',
        email: '',
        password: '',
        confirmPassword: '',
    }
  });

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
      form.setValue('logradouro', data.logradouro, { shouldValidate: true });
      form.setValue('bairro', data.bairro, { shouldValidate: true });
      form.setValue('cidade', data.localidade, { shouldValidate: true });
      form.setValue('uf', data.uf, { shouldValidate: true });
      form.setFocus('numero');

    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao buscar CEP.' });
    } finally {
      setIsCepLoading(false);
    }
  };

  const formatWithMask = (value: string, mask: (string | RegExp)[]) => {
    let i = 0;
    let lastReplacedIndex = -1;
    const filled = value.split('').every((char) => {
      while (i < mask.length) {
        const maskChar = mask[i];
        i++;
        if (maskChar instanceof RegExp) {
          if (maskChar.test(char)) {
            lastReplacedIndex = i - 1;
            return true;
          }
        } else if (maskChar === char) {
          lastReplacedIndex = i - 1;
          return true;
        }
      }
      return false;
    });

    if (!filled) {
      return value;
    }

    return mask.slice(0, lastReplacedIndex + 1).reduce((acc, maskChar) => {
        if (typeof maskChar === 'string') {
            return acc + maskChar;
        }
        const char = value.shift();
        return acc + char;
    }, '');
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    onChange: (value: string) => void,
    mask: string
  ) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    let formattedValue = rawValue;

    if (mask === 'cnpj') {
        formattedValue = rawValue
            .replace(/^(\d{2})(\d)/, '$1.$2')
            .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1/$2')
            .replace(/(\d{4})(\d)/, '$1-$2')
            .substring(0, 18);
    } else if (mask === 'cep') {
        formattedValue = rawValue
            .replace(/(\d{5})(\d)/, '$1-$2')
            .substring(0, 9);
    }

    onChange(formattedValue);
  };


  const onSubmit = async (data: CompanyFormData) => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      const { password, confirmPassword, ...companyData } = data;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: data.razaoSocial,
        tradingName: data.nomeFantasia,
        cnpj: data.cnpj,
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
        email: data.email,
        role: 'company',
        status: 'incomplete',
        createdAt: serverTimestamp(),
        // Initialize the full data structure to prevent future errors
        responsible: {
            name: '',
            cpf: '',
            document: null,
        },
        cnpjCard: null,
      });
      
      toast({
        title: "Cadastro recebido com sucesso!",
        description: "Você será redirecionado para completar seu perfil.",
      });

      router.push('/profile'); 
    } catch (error: any) {
       toast({
        variant: "destructive",
        title: "Erro no Cadastro",
        description: error.code === 'auth/email-already-in-use' 
            ? 'Este e-mail já está em uso.' 
            : error.message,
      });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-128px)] items-center justify-center bg-muted/40 px-4 py-12">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
           <div className="flex items-center gap-2 mb-2">
                <Building className="h-6 w-6 text-primary" />
                <CardTitle className="text-2xl">Cadastro de Empresa</CardTitle>
           </div>
          <CardDescription>Preencha os dados abaixo para criar a conta da sua empresa.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="cnpj"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>CNPJ</FormLabel>
                                <FormControl>
                                    <Input 
                                        placeholder="00.000.000/0000-00" 
                                        {...field}
                                        onChange={(e) => handleInputChange(e, field.onChange, 'cnpj')}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="razaoSocial"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Razão Social</FormLabel>
                                <FormControl><Input placeholder="Nome legal da empresa" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                 <FormField
                    control={form.control}
                    name="nomeFantasia"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nome Fantasia</FormLabel>
                            <FormControl><Input placeholder="Nome popular da empresa" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Separator />
                <h3 className="text-lg font-medium">Endereço</h3>

                <div className="grid md:grid-cols-3 gap-4">
                    <FormField
                        control={form.control}
                        name="cep"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>CEP</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input 
                                            placeholder="00000-000" 
                                            {...field}
                                            onBlur={() => handleCepBlur(field.value)}
                                            onChange={(e) => handleInputChange(e, field.onChange, 'cep')}
                                        />
                                        {isCepLoading && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin" />}
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="uf"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>UF</FormLabel>
                                <FormControl><Input placeholder="UF" {...field} readOnly /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="cidade"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Cidade</FormLabel>
                                <FormControl><Input placeholder="Cidade" {...field} readOnly/></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                 <div className="grid md:grid-cols-2 gap-4">
                     <FormField
                        control={form.control}
                        name="bairro"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Bairro</FormLabel>
                                <FormControl><Input placeholder="Bairro" {...field} readOnly/></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="logradouro"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Logradouro</FormLabel>
                                <FormControl><Input placeholder="Rua, Avenida, etc." {...field} readOnly/></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                 <div className="grid md:grid-cols-2 gap-4">
                     <FormField
                        control={form.control}
                        name="numero"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Número</FormLabel>
                                <FormControl><Input placeholder="Número" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="complemento"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Complemento (Opcional)</FormLabel>
                                <FormControl><Input placeholder="Apto, Bloco, etc." {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <Separator />
                <h3 className="text-lg font-medium">Dados de Acesso</h3>

                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl><Input type="email" placeholder="seu@email.com" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Senha</FormLabel>
                                <FormControl><Input type="password" placeholder="******" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Confirme a Senha</FormLabel>
                                <FormControl><Input type="password" placeholder="******" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin" /> : 'Criar Conta da Empresa'}
                </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            Já tem uma conta?{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Faça login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
