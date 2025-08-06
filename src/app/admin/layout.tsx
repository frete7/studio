
'use client';
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { Home, Users, Truck, Package, Settings, PanelLeft } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: Home },
  { href: '/admin/users', label: 'Usuários', icon: Users },
  { href: '/admin/freight', label: 'Fretes', icon: Package },
  { href: '/admin/vehicles', label: 'Veículos', icon: Truck },
  { href: '/admin/settings', label: 'Configurações', icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
        <div className="flex min-h-screen">
            <Sidebar>
                <SidebarHeader>
                    <div className="flex items-center justify-between">
                         <Link href="/" className="flex items-center gap-2">
                            <Truck className="h-6 w-6 text-primary" />
                            <span className="font-bold text-lg text-foreground">Frete7</span>
                        </Link>
                    </div>
                </SidebarHeader>
                <SidebarContent>
                    <SidebarMenu>
                        {navItems.map((item) => (
                            <SidebarMenuItem key={item.href}>
                                <Link href={item.href} passHref>
                                    <SidebarMenuButton
                                        isActive={pathname === item.href}
                                        tooltip={{
                                            children: item.label,
                                            side: 'right',
                                        }}
                                    >
                                        <item.icon className="h-4 w-4" />
                                        <span>{item.label}</span>
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarContent>
            </Sidebar>
            <main className="flex-1 overflow-y-auto">
                <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
                     <div className="flex items-center">
                        <SidebarTrigger className="md:hidden" />
                        <h1 className="text-xl font-semibold md:text-2xl ml-2">{navItems.find(item => item.href === pathname)?.label || 'Admin'}</h1>
                     </div>
                </header>
                <div className="p-4 md:p-6">
                     {children}
                </div>
            </main>
        </div>
    </SidebarProvider>
  );
}
