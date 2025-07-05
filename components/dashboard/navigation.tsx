'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  BarChart3, 
  Settings, 
  FileText, 
  Users, 
  Menu,
  X,
  Globe
} from 'lucide-react';

const navigationItems = [
  { name: 'Dashboard', href: '/listnumber', icon: Home, current: true },
  { name: 'Numero', href: '/numbers', icon: BarChart3, current: false },
  { name: 'Integracion de API', href: '/api-integration', icon: Globe, current: false },
  { name: 'Reportes', href: '/reports', icon: FileText, current: false },
  { name: 'Usuarios', href: '/users', icon: Users, current: false },
  { name: 'Configuracion', href: '/settings', icon: Settings, current: false },
];

export function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigation = (href: string) => {
    router.push(href);
    setIsMobileMenuOpen(false);
  };

  const isCurrentPage = (href: string) => {
    return pathname === href;
  };


  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="fixed top-4 left-4 z-50"
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </Button>
      </div>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-25" />
          <nav className="fixed top-0 left-0 bottom-0 flex flex-col w-5/6 max-w-sm bg-white shadow-xl">
            <div className="px-4 py-6">
              <h2 className="text-lg font-semibold">Navigation</h2>
            </div>
            <div className="flex-1 px-4 space-y-1">
              {navigationItems.map((item) => (
                <Button
                  key={item.name}
                  variant={isCurrentPage(item.href) ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <item.icon className="mr-3 h-4 w-4" />
                  {item.name}
                </Button>
              ))}
            </div>
          </nav>
        </div>
      )}

      {/* Desktop navigation */}
      <nav className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:border-r lg:bg-gray-50 lg:pt-5 lg:pb-4">
        <div className="flex items-center flex-shrink-0 px-4">
          <h1 className="text-xl font-bold">Process Dashboard</h1>
        </div>
        <div className="mt-6 flex-1 px-4 space-y-1">
          {navigationItems.map((item) => (
            <Button
              key={item.name}
              variant={isCurrentPage(item.href) ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => handleNavigation(item.href)}
            >
              <item.icon className="mr-3 h-4 w-4" />
              {item.name}
            </Button>
          ))}
        </div>
      </nav>
    </>
  );
}