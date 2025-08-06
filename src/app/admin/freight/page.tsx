
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function AdminFreightPage() {
  return (
    <div>
        <Card>
            <CardHeader>
                <CardTitle>Gerenciamento de Fretes</CardTitle>
                <CardDescription>Monitore e gerencie todos os fretes anunciados.</CardDescription>
            </CardHeader>
            <CardContent>
                <p>Em breve: uma tabela com todos os fretes, com opções para visualizar detalhes, editar ou remover.</p>
            </CardContent>
        </Card>
    </div>
  );
}
