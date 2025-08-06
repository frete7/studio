import Link from 'next/link';
import { Truck, Facebook, Twitter, Instagram } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background/95">
      <div className="container max-w-7xl py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2">
              <Truck className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg">Frete7</span>
            </Link>
            <p className="text-sm text-foreground/60">Conectando cargas e caminhoneiros em todo o Brasil.</p>
            <div className="flex gap-4">
                <Link href="#" className="text-foreground/60 hover:text-primary"><Facebook size={20} /></Link>
                <Link href="#" className="text-foreground/60 hover:text-primary"><Twitter size={20} /></Link>
                <Link href="#" className="text-foreground/60 hover:text-primary"><Instagram size={20} /></Link>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Soluções</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="text-foreground/60 hover:text-primary">Buscar Fretes</Link></li>
              <li><Link href="/optimizer" className="text-foreground/60 hover:text-primary">Otimizar Rota</Link></li>
              <li><Link href="#" className="text-foreground/60 hover:text-primary">Para Empresas</Link></li>
              <li><Link href="#" className="text-foreground/60 hover:text-primary">Para Motoristas</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Empresa</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="text-foreground/60 hover:text-primary">Sobre Nós</Link></li>
              <li><Link href="#" className="text-foreground/60 hover:text-primary">Carreiras</Link></li>
              <li><Link href="#" className="text-foreground/60 hover:text-primary">Contato</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="text-foreground/60 hover:text-primary">Termos de Serviço</Link></li>
              <li><Link href="#" className="text-foreground/60 hover:text-primary">Política de Privacidade</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-border/40 pt-8 text-center text-sm text-foreground/60">
          <p>&copy; {new Date().getFullYear()} Frete7. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
