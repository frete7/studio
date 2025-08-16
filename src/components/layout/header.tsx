
'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Truck, LogOut, User as UserIcon, Cog, Sparkles, LayoutDashboard } from 'lucide-react';
import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';

const navLinks = [
  { href: '/fretes', label: 'Buscar Fretes' },
  { href: '/optimizer', label: 'Otimizar Rota' },
  { href: '/#empresas', label: 'Empresas' },
  { href: '/#motoristas', label: 'Motoristas' },
];

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { 
    user, 
    profile, 
    isLoading, 
    isAuthenticated, 
    role, 
    status, 
    logout 
  } = useAuth();

  // Memoizar funções para evitar recriações
  const getInitials = useCallback((email?: string | null) => {
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
  }, []);
  
  const getDashboardLink = useCallback(() => {
    switch (role) {
      case 'admin':
        return '/admin';
      case 'company':
        return '/company-dashboard';
      case 'driver':
        return '/driver-dashboard';
      default:
        return '/profile';
    }
  }, [role]);
  
  const getRoleBadgeVariant = useCallback((role: string | null): "default" | "secondary" | "destructive" | "outline" => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'driver':
        return 'secondary';
      case 'company':
        return 'outline';
      default:
        return 'default';
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      toast({
        title: 'Você saiu!',
        description: 'Até a próxima!',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao sair',
        description: 'Não foi possível fazer o logout. Tente novamente.',
      });
    }
  }, [logout, toast]);

  // Memoizar seções renderizadas
  const renderAuthSection = useMemo(() => {
    if (isLoading) {
      return <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />;
    }

    if (isAuthenticated && user && profile) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.photoURL ?? ''} alt={user.email ?? ''} />
                <AvatarFallback>{getInitials(user.email)}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-2">
                <p className="text-sm font-medium leading-none">Minha Conta</p>
                <div className="flex items-center justify-between">
                    <p className="text-xs leading-none text-muted-foreground truncate">
                    {user.email}
                    </p>
                    {role && (
                        <Badge variant={getRoleBadgeVariant(role)} className="capitalize text-xs">
                            {role === 'driver' ? 'Motorista' : role === 'company' ? 'Empresa' : role}
                        </Badge>
                    )}
                </div>
                {status && status !== 'active' && (
                  <Badge variant="outline" className="text-xs">
                    {status === 'pending' ? 'Aguardando Aprovação' : 
                     status === 'incomplete' ? 'Perfil Incompleto' : 
                     status === 'blocked' ? 'Bloqueado' : 
                     status === 'suspended' ? 'Suspenso' : status}
                  </Badge>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
             <DropdownMenuItem onClick={() => router.push('/profile')}>
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Meu Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(getDashboardLink())}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>Meu Painel</span>
            </DropdownMenuItem>
             {role === 'admin' && (
              <DropdownMenuItem onClick={() => router.push('/admin')}>
                <Cog className="mr-2 h-4 w-4" />
                <span>Painel Admin</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
       <div className="hidden md:flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Cadastre-se</Link>
          </Button>
        </div>
    );
  }, [isLoading, isAuthenticated, user, profile, role, status, getInitials, getRoleBadgeVariant, getDashboardLink, handleLogout, router]);
  
  const renderMobileAuthSection = useMemo(() => {
    if (isLoading) {
      return null;
    }
    
    if (isAuthenticated && profile) {
       return (
         <>
          <Button variant="outline" asChild onClick={() => setIsOpen(false)}>
            <Link href={getDashboardLink()}>Meu Painel</Link>
          </Button>
          <Button onClick={handleLogout} className="w-full">
            Sair
          </Button>
         </>
       )
    }
    
    return (
       <div className="flex flex-col gap-4">
           <Button variant="outline" asChild onClick={() => setIsOpen(false)}>
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild onClick={() => setIsOpen(false)}>
            <Link href="/register">Cadastre-se</Link>
          </Button>
        </div>
    )
  }, [isLoading, isAuthenticated, profile, getDashboardLink, handleLogout]);

  // Memoizar link de solicitação
  const solicitRequestLink = useMemo(() => 
    role === 'company' ? "/fretes/solicitar" : "/solicitar-frete", 
    [role]
  );

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
            <Button asChild>
                <Link href={solicitRequestLink}>
                    Solicitar Frete
                    <Sparkles className="ml-2 h-4 w-4" />
                </Link>
            </Button>
          {renderAuthSection}
        </div>
        <div className="md:hidden flex items-center">
         {!isLoading && isAuthenticated && (
            <div className="mr-2">
              {renderAuthSection}
            </div>
          )}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Abrir menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetTitle className="sr-only">Menu Principal</SheetTitle>
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
                  <Link href={solicitRequestLink} className="font-semibold text-primary" onClick={() => setIsOpen(false)}>
                      Solicitar Frete
                  </Link>
                </nav>
                <div className="mt-auto flex flex-col gap-4 pt-6 border-t">
                  {renderMobileAuthSection}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
