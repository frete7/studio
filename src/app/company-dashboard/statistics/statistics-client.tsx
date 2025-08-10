
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

import { type CompanyStats } from '@/app/actions';
import { Loader2, ArrowLeft, BarChart, Package, PackageCheck, Ban } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { Bar, BarChart as RechartsBarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

type MonthlyStats = {
    name: string;
    total: number;
    concluido: number;
    cancelado: number;
}

type StatisticsClientProps = {
    initialCompanyStats: CompanyStats | null;
    initialMonthlyStats: MonthlyStats[];
}

export default function StatisticsClient({ initialCompanyStats, initialMonthlyStats }: StatisticsClientProps) {
    const [companyStats] = useState<CompanyStats | null>(initialCompanyStats);
    const [monthlyStats] = useState<MonthlyStats[]>(initialMonthlyStats);

    const chartConfig = {
        total: {
            label: "Total Anunciado",
            color: "hsl(var(--chart-1))",
        },
        concluido: {
            label: "Concluído",
            color: "hsl(var(--chart-2))",
        },
        cancelado: {
            label: "Cancelado",
            color: "hsl(var(--destructive))",
        },
    }
    
    if (!companyStats) {
        return (
             <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div className="mb-8">
                <Button asChild variant="outline" className="mb-4">
                    <Link href="/company-dashboard">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar para o Painel
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold font-headline text-primary">Estatísticas da Operação</h1>
                <p className="text-foreground/70">Acompanhe o desempenho dos seus fretes na plataforma.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Fretes Ativos</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{companyStats.activeFreights}</div>
                        <p className="text-xs text-muted-foreground">Disponíveis para motoristas</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Fretes Concluídos</CardTitle>
                        <PackageCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{companyStats.completedFreights}</div>
                         <p className="text-xs text-muted-foreground">Total de entregas finalizadas</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Fretes Cancelados</CardTitle>
                        <Ban className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{companyStats.canceledFreights}</div>
                        <p className="text-xs text-muted-foreground">Total de fretes cancelados</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Fretes</CardTitle>
                        <BarChart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{companyStats.totalFreights}</div>
                         <p className="text-xs text-muted-foreground">Total de fretes anunciados</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Atividade de Fretes (Últimos 12 meses)</CardTitle>
                </CardHeader>
                <CardContent>
                     <ChartContainer config={chartConfig as any} className="min-h-[300px] w-full">
                        <RechartsBarChart data={monthlyStats}>
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="name"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                            />
                             <YAxis />
                            <ChartTooltip content={<ChartTooltipContent />} />
                             <ChartLegend content={<ChartLegendContent />} />
                            <Bar dataKey="total" fill="var(--color-total)" radius={4} name="Total Anunciado" />
                            <Bar dataKey="concluido" fill="var(--color-concluido)" radius={4} name="Concluídos" />
                             <Bar dataKey="cancelado" fill="var(--color-cancelado)" radius={4} name="Cancelados" />
                        </RechartsBarChart>
                    </ChartContainer>
                </CardContent>
            </Card>

        </div>
    )
}
