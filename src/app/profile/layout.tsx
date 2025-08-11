'use client';

import { Home, Search, User, FileText, ClipboardList } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LayoutDashboard } from "lucide-react";


const navItems = [
    { href: '/driver-dashboard', label: 'Início', icon: Home },
    { href: '/driver-dashboard/cadastrar-volta', label: 'Cad. Volta', icon: FileText },
    { href: '/driver-dashboard/curriculo', label: 'Currículo', icon: ClipboardList },
    { href: '/profile', label: 'Perfil', icon: User },
];

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 pb-24 md:pb-0">
          {children}
      </main>
      
      {/* Bottom Navigation for Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-24 bg-transparent z-50">
        <div className="relative h-full">
            {/* Central Floating Button */}
            <div className="absolute left-1/2 -top-6 -translate-x-1/2 z-20">
                <Button asChild className="rounded-full w-16 h-16 shadow-lg bg-primary hover:bg-primary/90 flex items-center justify-center">
                     <Link href="/fretes">
                        <Search className="h-8 w-8 text-primary-foreground" />
                        <span className="sr-only">Buscar Fretes</span>
                    </Link>
                </Button>
            </div>
            
            {/* Navigation Bar */}
            <nav className="absolute bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg h-16">
              <div className="flex justify-around items-center h-full">
                  {navItems.slice(0, 2).map((item) => {
                      const isActive = pathname === item.href;
                      return (
                          <Link
                              key={item.href}
                              href={item.href}
                              className={cn(
                                  "flex flex-col items-center justify-center w-full h-full text-xs font-medium transition-colors",
                                  isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
                              )}
                          >
                              <item.icon className="h-5 w-5 mb-1" />
                              <span>{item.label}</span>
                          </Link>
                      )
                  })}
                  
                  {/* Spacer for the central button */}
                  <div className="w-1/5"></div>

                  {navItems.slice(2, 4).map((item) => {
                      const isActive = pathname === item.href;
                      return (
                          <Link
                              key={item.href}
                              href={item.href}
                              className={cn(
                                  "flex flex-col items-center justify-center w-full h-full text-xs font-medium transition-colors",
                                  isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
                              )}
                          >
                              <item.icon className="h-5 w-5 mb-1" />
                              <span>{item.label}</span>
                          </Link>
                      )
                  })}
              </div>
            </nav>
        </div>
      </div>
    </div>
  );
}
