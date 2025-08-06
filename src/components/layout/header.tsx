'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Truck } from 'lucide-react';
import React from 'react';

const navLinks = [
  { href: '#', label: 'Buscar Fretes' },
  { href: '/optimizer', label: 'Otimizar Rota' },
  { href: '#', label: 'Empresas' },
  { href: '#', label: 'Motoristas' },
];

export default function Header() {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Truck className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">Frete7</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {navLinks.map((link, index) => (
            <Link key={`${link.href}-${index}`} href={link.href} className="text-foreground/60 transition-colors hover:text-foreground/80">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="#">Entrar</Link>
          </Button>
          <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Link href="#">Anunciar Carga</Link>
          </Button>
        </div>
        <div className="md:hidden">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Abrir menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <div className="flex flex-col gap-6 p-6">
                <Link href="/" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
                  <Truck className="h-6 w-6 text-primary" />
                  <span className="font-bold text-lg">Frete7</span>
                </Link>
                <nav className="flex flex-col gap-4">
                  {navLinks.map((link, index) => (
                    <Link key={`${link.href}-${index}-mobile`} href={link.href} className="text-foreground/80 transition-colors hover:text-foreground" onClick={() => setIsOpen(false)}>
                      {link.label}
                    </Link>
                  ))}
                </nav>
                <div className="flex flex-col gap-4">
                   <Button variant="outline" asChild>
                    <Link href="#">Entrar</Link>
                  </Button>
                  <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
                    <Link href="#">Anunciar Carga</Link>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
