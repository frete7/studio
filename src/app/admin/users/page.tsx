
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function AdminUsersPage() {
  return (
    <div>
        <Card>
            <CardHeader>
                <CardTitle>Gerenciamento de Usuários</CardTitle>
                <CardDescription>Visualize e gerencie os usuários da plataforma.</CardDescription>
            </CardHeader>
            <CardContent>
                <p>Em breve: uma tabela com todos os usuários, com opções para editar, visualizar perfil e alterar a função.</p>
            </CardContent>
        </Card>
    </div>
  );
}
