
import { Card, CardContent } from "@/components/ui/card";
import { Truck, Shapes, Container } from "lucide-react";
import Link from "next/link";

export default function AdminSettingsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline text-primary">Configurações da Plataforma</h1>
        <p className="text-foreground/70">Ajustes e personalizações gerais do sistema.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/vehicle-types">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardContent className="flex flex-col items-center justify-center p-6 aspect-square">
                <Truck className="h-10 w-10 text-primary mb-4" />
                <span className="font-semibold text-center">Tipos de Veículos</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/categories">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardContent className="flex flex-col items-center justify-center p-6 aspect-square">
                <Shapes className="h-10 w-10 text-primary mb-4" />
                <span className="font-semibold text-center">Categorias de Veículos</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/body-types">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardContent className="flex flex-col items-center justify-center p-6 aspect-square">
                <Container className="h-10 w-10 text-primary mb-4" />
                <span className="font-semibold text-center">Tipos de Carrocerias</span>
            </CardContent>
          </Card>
        </Link>
        {/* Outros cards de configuração podem ser adicionados aqui no futuro */}
      </div>
    </div>
  );
}
