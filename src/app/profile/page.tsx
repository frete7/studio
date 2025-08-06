
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { User } from "lucide-react";

export default function ProfilePage() {
  return (
    <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        Meu Perfil
                    </CardTitle>
                    <CardDescription>
                        Mantenha suas informações sempre atualizadas.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Em breve: um formulário para você editar seus dados pessoais, informações de motorista, veículos e documentos.</p>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
