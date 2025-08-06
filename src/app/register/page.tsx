
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Building, Truck as TruckIcon } from "lucide-react";
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterTypeSelectionPage() {
    const router = useRouter();

    return (
        <div className="flex min-h-[calc(100vh-128px)] items-center justify-center bg-muted/40 px-4 py-12">
            <div className="w-full max-w-4xl">
                 <div className="text-center mb-12">
                    <div className="flex justify-center items-center gap-2 mb-4">
                        <TruckIcon className="h-8 w-8 text-primary" />
                        <span className="text-2xl font-bold">Frete7</span>
                    </div>
                    <h1 className="text-3xl font-bold font-headline">Seja bem-vindo!</h1>
                    <p className="mt-2 text-lg text-foreground/70">
                        Para começar, escolha o tipo de conta que você deseja criar.
                    </p>
                </div>
                <div className="grid md:grid-cols-2 gap-8">
                    <Card className="hover:border-primary/50 hover:shadow-lg transition-all duration-300">
                        <CardHeader>
                            <Building className="h-10 w-10 text-primary mb-4"/>
                            <CardTitle>Sou uma Empresa</CardTitle>
                            <CardDescription>
                                Quero anunciar minhas cargas, encontrar os melhores motoristas e gerenciar meus fretes.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button className="w-full" asChild>
                                <Link href="/register/company">
                                    Cadastrar Empresa
                                    <ArrowRight className="ml-2 h-4 w-4"/>
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                     <Card className="hover:border-primary/50 hover:shadow-lg transition-all duration-300">
                        <CardHeader>
                            <TruckIcon className="h-10 w-10 text-primary mb-4"/>
                            <CardTitle>Sou Motorista</CardTitle>
                            <CardDescription>
                                Quero encontrar as melhores oportunidades de frete, otimizar minhas rotas e aumentar meus lucros.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button className="w-full" variant="secondary" disabled>
                                Em Breve
                            </Button>
                        </CardContent>
                    </Card>
                </div>
                 <div className="mt-8 text-center text-sm">
                    Já tem uma conta?{' '}
                    <Link href="/login" className="font-semibold text-primary hover:underline">
                        Faça login
                    </Link>
                </div>
            </div>
        </div>
    )
}
