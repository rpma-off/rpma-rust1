'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/compatibility';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  LayoutDashboard,
  Calendar,
  Car,
  Users,
  Activity,
  BarChart3,
  Package,
  FileText,
  Shield,
  ChevronLeft,
  ChevronRight,
  User
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Calendrier', icon: <Calendar className="w-5 h-5" /> },
  { href: '/tasks', label: 'Tâches', icon: <Car className="w-5 h-5" /> },
  { href: '/clients', label: 'Clients', icon: <Users className="w-5 h-5" /> },
  { href: '/interventions', label: 'Interventions', icon: <Activity className="w-5 h-5" /> },
  { href: '/analytics', label: 'Analyses', icon: <BarChart3 className="w-5 h-5" /> },
  { href: '/inventory', label: 'Matériel', icon: <Package className="w-5 h-5" /> },
  { href: '/reports', label: 'Rapports', icon: <FileText className="w-5 h-5" /> },
];

const adminNavItems: NavItem[] = [
  { href: '/admin', label: 'Administration', icon: <Shield className="w-5 h-5" />, adminOnly: true },
];

export function SimpleSidebar() {
  const pathname = usePathname();
  const { user, profile } = useAuth();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Load saved state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebar-expanded');
    if (savedState !== null) {
      setIsExpanded(JSON.parse(savedState));
    }
  }, []);

  // Save state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('sidebar-expanded', JSON.stringify(isExpanded));
  }, [isExpanded]);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  const NavButton = ({ item }: { item: NavItem }) => {
    const button = (
      <Button
        variant={isActive(item.href) ? 'secondary' : 'ghost'}
        className={cn(
          'w-full justify-start h-12 transition-all duration-200',
          isExpanded ? 'px-4' : 'px-3',
          isActive(item.href)
            ? 'bg-[#334155] text-white border-l-4 border-[#14B8A6] hover:bg-[#334155]/80'
            : 'text-gray-300 hover:text-white hover:bg-[#334155]/30'
        )}
      >
        <span className="flex-shrink-0">{item.icon}</span>
        {isExpanded && (
          <span className="ml-3 font-medium">{item.label}</span>
        )}
      </Button>
    );

    if (!isExpanded) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right" className="ml-2">
            <p>{item.label}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return button;
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-white border border-gray-200 rounded-lg shadow-md flex items-center justify-center"
      >
        <Activity className="w-5 h-5 text-gray-700" />
      </button>

      {/* Mobile Navigation Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed left-0 top-0 bottom-0 w-64 bg-[#1E293B] text-white overflow-y-auto transform transition-transform duration-300 ease-in-out">
            <div className="flex items-center justify-between p-4 border-b border-[#334155]">
              <div className="flex items-center gap-3">
                <div className="bg-teal-500 rounded-lg h-8 w-8 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">RPMA</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            
            <nav className="flex-1 p-2 space-y-1">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive(item.href) ? 'secondary' : 'ghost'}
                    className={cn(
                      'w-full justify-start h-12 transition-all duration-200 px-4',
                      isActive(item.href)
                        ? 'bg-[#334155] text-white border-l-4 border-[#14B8A6] hover:bg-[#334155]/80'
                        : 'text-gray-300 hover:text-white hover:bg-[#334155]/30'
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    <span className="ml-3 font-medium">{item.label}</span>
                  </Button>
                </Link>
              ))}

              {/* Admin section */}
              {(user?.role === 'admin' || user?.role === 'supervisor') && (
                <>
                  <div className="px-4 py-2 mt-4 mb-2">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Administration
                    </div>
                  </div>
                  {adminNavItems.map((item) => (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant={isActive(item.href) ? 'secondary' : 'ghost'}
                        className={cn(
                          'w-full justify-start h-12 transition-all duration-200 px-4',
                          isActive(item.href)
                            ? 'bg-[#334155] text-white border-l-4 border-[#14B8A6] hover:bg-[#334155]/80'
                            : 'text-gray-300 hover:text-white hover:bg-[#334155]/30'
                        )}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <span className="flex-shrink-0">{item.icon}</span>
                        <span className="ml-3 font-medium">{item.label}</span>
                      </Button>
                    </Link>
                  ))}
                </>
              )}
            </nav>

            {/* User section */}
            <div className="p-4 border-t border-[#334155]">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">
                    {profile?.first_name} {profile?.last_name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <TooltipProvider delayDuration={0}>
        <aside className={cn(
          'hidden lg:flex flex-col bg-[#1E293B] text-white transition-all duration-300 ease-in-out',
          isExpanded ? 'w-64' : 'w-16'
        )}>
      {/* Header with toggle button */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-[#334155]">
        <div className="flex items-center gap-3">
          <div className="bg-teal-500 rounded-lg h-8 w-8 flex items-center justify-center flex-shrink-0">
            <Activity className="h-5 w-5 text-white" />
          </div>
          {isExpanded && (
            <span className="text-xl font-bold text-white">RPMA</span>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="h-8 w-8 p-0 hover:bg-[#334155]/50 text-gray-300 hover:text-white"
        >
          {isExpanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <NavButton item={item} />
          </Link>
        ))}
        
        {/* Admin section */}
        {(user?.role === 'admin' || user?.role === 'supervisor') && (
          <>
            {isExpanded && (
              <div className="px-4 py-2 mt-4 mb-2">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Administration
                </div>
              </div>
            )}
            {adminNavItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <NavButton item={item} />
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* User section */}
      {isExpanded && (
        <div className="p-4 border-t border-[#334155]">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">
                {profile?.first_name} {profile?.last_name}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {user?.email}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Collapsed user icon */}
      {!isExpanded && (
        <div className="p-2 border-t border-[#334155]">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center mx-auto">
                <User className="w-5 h-5 text-white" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="ml-2">
              <div>
                <p className="font-medium">{profile?.first_name} {profile?.last_name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      )}
    </aside>
    </TooltipProvider>
    </>
  );
}