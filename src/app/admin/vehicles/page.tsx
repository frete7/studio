
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function AdminVehiclesPage() {
  return (
    <div>
        <Card>
            <CardHeader>
                <CardTitle>Gerenciamento de Veículos</CardTitle>
                <CardDescription>Gerencie os tipos de veículos disponíveis na plataforma.</CardDescription>
            </CardHeader>
            <CardContent>
                <p>Em breve: uma lista de tipos de veículos, com opções para adicionar, editar ou remover.</p>
            </CardContent>
        </Card>
    </div>
  );
}
