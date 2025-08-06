
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function AdminVehiclesPage() {
  return (
    <div>
        <Card>
            <CardHeader>
                <CardTitle>Gerenciamento de Veículos</CardTitle>
                <CardDescription>Visualize e gerencie todos os veículos da plataforma.</CardDescription>
            </CardHeader>
            <CardContent>
                <p>Em breve: uma tabela com todos os veículos cadastrados pelos usuários, com opções para visualizar detalhes, editar ou remover.</p>
            </CardContent>
        </Card>
    </div>
  );
}
