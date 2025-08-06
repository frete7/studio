
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpRight, CreditCard, DollarSign, Users } from "lucide-react";

export default function AdminBillingPage() {
  // Placeholder data - replace with actual data from your backend
  const recentTransactions = [
    {
        name: 'João Silva',
        email: 'joao.silva@example.com',
        plan: 'Plano Mensal - Motorista',
        amount: 'R$ 49,90',
        date: '2024-07-28',
        status: 'Pago',
    },
    {
        name: 'Transportadora Veloz',
        email: 'contato@veloz.com',
        plan: 'Plano Anual - Empresa',
        amount: 'R$ 599,00',
        date: '2024-07-27',
        status: 'Pago',
    },
    {
        name: 'Maria Fernandes',
        email: 'maria.f@example.com',
        plan: 'Plano Mensal - Motorista',
        amount: 'R$ 49,90',
        date: '2024-07-27',
        status: 'Pendente',
    },
  ];

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline text-primary">Faturamento</h1>
        <p className="text-foreground/70">Monitore a saúde financeira do seu negócio.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receita Mensal (MRR)</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(12530.50)}</div>
                <p className="text-xs text-muted-foreground">+5.2% em relação ao mês passado</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Assinantes Ativos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">+254</div>
                <p className="text-xs text-muted-foreground">+32 assinantes este mês</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Novas Assinaturas (Mês)</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">+32</div>
                <p className="text-xs text-muted-foreground">Total de R$ 1.850,00</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cancelamentos (Churn)</CardTitle>
                <ArrowUpRight className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-destructive">3.1%</div>
                <p className="text-xs text-muted-foreground">8 assinantes cancelaram</p>
            </CardContent>
        </Card>
      </div>

       <Card>
        <CardHeader>
            <CardTitle>Transações Recentes</CardTitle>
            <CardDescription>
                Acompanhe os últimos pagamentos realizados na plataforma.
            </CardDescription>
        </CardHeader>
        <CardContent>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Plano</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Data</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {recentTransactions.map((transaction, index) => (
                        <TableRow key={index}>
                            <TableCell>
                                <div className="font-medium">{transaction.name}</div>
                                <div className="text-sm text-muted-foreground">{transaction.email}</div>
                            </TableCell>
                            <TableCell>{transaction.plan}</TableCell>
                            <TableCell className="text-right">{transaction.amount}</TableCell>
                            <TableCell className="text-center">
                                <Badge variant={transaction.status === 'Pago' ? 'default' : 'secondary'}>
                                    {transaction.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">{transaction.date}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
       </Card>
    </div>
  );
}
