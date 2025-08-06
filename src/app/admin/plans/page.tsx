
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function AdminPlansPage() {
  return (
    <div>
        <Card>
            <CardHeader>
                <CardTitle>Gerenciamento de Planos</CardTitle>
                <CardDescription>Gerencie os planos e assinaturas dos usuários.</CardDescription>
            </CardHeader>
            <CardContent>
                <p>Em breve: uma lista dos planos disponíveis, com opções para criar, editar ou remover planos.</p>
            </CardContent>
        </Card>
    </div>
  );
}
