
'use client';

import { Home, Search, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
    { href: '/driver-dashboard', label: 'Início', icon: Home },
    { href: '/fretes', label: 'Buscar', icon: Search },
    { href: '/profile', label: 'Perfil', icon: User },
];

export default function DriverDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 pb-20">
          {children}
      </main>
      
      {/* Bottom Navigation for Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg z-50">
          <div className="flex justify-around items-center h-16">
              {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                      <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                              "flex flex-col items-center justify-center w-full h-full text-sm font-medium transition-colors",
                              isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
                          )}
                      >
                          <item.icon className="h-6 w-6 mb-1" />
                          <span>{item.label}</span>
                      </Link>
                  )
              })}
          </div>
      </nav>
    </div>
  );
}
