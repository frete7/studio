'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Truck, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'driver' | 'company'>('driver');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) {
        toast({
            variant: "destructive",
            title: "Erro no Cadastro",
            description: "Por favor, selecione se você é um motorista ou uma empresa.",
        });
        return;
    }
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create user document in Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: name,
        email: email,
        role: role,
        createdAt: serverTimestamp(),
      });
      
      toast({
        title: "Sucesso!",
        description: "Sua conta foi criada. Você será redirecionado.",
      });
      router.push('/'); 
    } catch (error: any) {
       toast({
        variant: "destructive",
        title: "Erro no Cadastro",
        description: error.message,
      });
    } finally {
        setIsLoading(false);
    }
  };


  return (
    <div className="flex min-h-[calc(100vh-128px)] items-center justify-center bg-muted/40 px-4 py-12">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
           <div className="flex justify-center items-center gap-2 mb-4">
            <Truck className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">Frete7</span>
          </div>
          <CardTitle>Crie sua conta</CardTitle>
          <CardDescription>É rápido e fácil. Comece a otimizar seus fretes agora mesmo.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
             <div className="space-y-3">
                <Label>Você é:</Label>
                <RadioGroup defaultValue="driver" onValueChange={(value: 'driver' | 'company') => setRole(value)} className="flex gap-4">
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="driver" id="r-driver" />
                        <Label htmlFor="r-driver">Motorista</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="company" id="r-company" />
                        <Label htmlFor="r-company">Empresa</Label>
                    </div>
                </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input id="name" type="text" placeholder="Seu nome ou nome da empresa" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="seu@email.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : 'Criar Conta'}
            </Button>
          </form>
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

