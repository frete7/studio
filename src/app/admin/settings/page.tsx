
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Truck } from "lucide-react";
import Link from "next/link";

export default function AdminSettingsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline text-primary">Configurações da Plataforma</h1>
        <p className="text-foreground/70">Ajustes e personalizações gerais do sistema.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Truck className="h-6 w-6" />
              <span>Tipos de Veículos</span>
            </CardTitle>
            <CardDescription>
              Gerencie os tipos de veículos que os motoristas podem cadastrar na plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Adicione, edite ou remova tipos de veículos como "Van", "Caminhão Toco", "Carreta", etc.</p>
          </CardContent>
          <CardFooter>
            <Button asChild>
              <Link href="/admin/vehicles">
                Gerenciar Veículos <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
        {/* Outros cards de configuração podem ser adicionados aqui no futuro */}
      </div>
    </div>
  );
}
