
'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Truck, LogOut, User as UserIcon, Cog, Sparkles } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
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

const navLinks = [
  { href: '/fretes', label: 'Buscar Fretes' },
  { href: '/optimizer', label: 'Otimizar Rota' },
  { href: '/#empresas', label: 'Empresas' },
  { href: '/#motoristas', label: 'Motoristas' },
];

export default function Header() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserRole(userData.role);
          
          // Redirection logic based on user status
          const isProfilePage = pathname.startsWith('/profile');
          const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');
          const allowedPaths = isProfilePage || isAuthPage || pathname.startsWith('/api');

          if (userData.status === 'incomplete' && !allowedPaths) {
              router.push('/profile');
          } else if (userData.status === 'pending' && !allowedPaths) {
              router.push('/profile');
          }

        } else {
          setUserRole('user');
        }
      } else {
        setUser(null);
        setUserRole(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [pathname, router]);
  
  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: 'Você saiu!',
        description: 'Até a próxima!',
      });
      router.push('/login');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao sair',
        description: 'Não foi possível fazer o logout. Tente novamente.',
      });
    }
  };
  
  const getInitials = (email?: string | null) => {
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
  }
  
  const getRoleBadgeVariant = (role: string | null): "default" | "secondary" | "destructive" | "outline" => {
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
  }

  const renderAuthSection = () => {
    if (isLoading) {
      return <div className="h-10 w-24 rounded-md bg-muted animate-pulse" />;
    }

    if (user) {
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
                    {userRole && (
                        <Badge variant={getRoleBadgeVariant(userRole)} className="capitalize text-xs">
                            {userRole === 'driver' ? 'Motorista' : userRole === 'company' ? 'Empresa' : userRole}
                        </Badge>
                    )}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/profile')}>
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Meu Perfil</span>
            </DropdownMenuItem>
             {userRole === 'admin' && (
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
  };
  
  const renderMobileAuthSection = () => {
     if (isLoading) {
      return <div className="h-10 w-full rounded-md bg-muted animate-pulse" />;
    }
    
    if (user) {
       return (
         <>
          <Button variant="outline" asChild onClick={() => setIsOpen(false)}>
            <Link href="/profile">Meu Perfil</Link>
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
  }

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
              <Link href="/solicitar-frete">
                Solicitar Frete
                <Sparkles className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          {renderAuthSection()}
        </div>
        <div className="md:hidden flex items-center">
         {user && !isLoading && (
            <div className="mr-2">
              {renderAuthSection()}
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
                   <Link href="/solicitar-frete" className="font-semibold text-primary" onClick={() => setIsOpen(false)}>
                      Solicitar Frete
                    </Link>
                </nav>
                <div className="mt-auto flex flex-col gap-4 pt-6 border-t">
                  {renderMobileAuthSection()}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
