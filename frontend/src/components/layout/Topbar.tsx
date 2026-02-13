'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Menu, Search, X, CalendarDays, Wrench, FileText, Users, ChevronDown, UserCircle, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/compatibility';

interface TopbarProps {
  onMenuToggle: () => void;
  onSidebarToggle: () => void;
  isSidebarOpen: boolean;
}

const navTabs = [
  { key: 'calendar', label: 'Calendar', href: '/dashboard', enabled: true, icon: <CalendarDays className="h-4 w-4" /> },
  { key: 'jobs', label: 'Jobs', href: '/tasks', enabled: true, icon: <Wrench className="h-4 w-4" /> },
  { key: 'proposals', label: 'Proposals', href: '#', enabled: false, icon: <FileText className="h-4 w-4" /> },
  { key: 'customers', label: 'Customers', href: '/clients', enabled: true, icon: <Users className="h-4 w-4" /> },
];

export function Topbar({ onMenuToggle, onSidebarToggle, isSidebarOpen }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const displayName = profile?.first_name && profile?.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : user?.username || '';
  const displayInitial = profile?.first_name?.charAt(0) || user?.username?.charAt(0)?.toUpperCase() || 'U';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const activeTab = (() => {
    if (pathname === '/dashboard') return 'calendar';
    if (pathname.startsWith('/tasks') || pathname.startsWith('/interventions')) return 'jobs';
    if (pathname.startsWith('/clients')) return 'customers';
    return 'calendar';
  })();

  return (
    <header className="bg-[hsl(var(--rpma-teal))] text-white h-[62px] sticky top-0 z-40 shadow-[var(--rpma-shadow-soft)]">
      <div className="h-full px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-full hover:bg-white/15 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            onClick={onSidebarToggle}
            className="hidden lg:inline-flex p-2 rounded-full hover:bg-white/15 transition-colors"
            aria-label="Toggle sidebar"
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <nav className="hidden md:flex h-full items-stretch gap-1">
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const baseClasses = cn(
              'flex items-center gap-2 px-6 h-full border-b-[3px] uppercase tracking-wide text-sm',
              isActive ? 'border-white text-white font-semibold' : 'border-transparent text-white/85',
              tab.enabled ? 'hover:bg-white/10 hover:text-white' : 'opacity-50 cursor-not-allowed'
            );

            return tab.enabled ? (
              <Link key={tab.key} href={tab.href} className={baseClasses}>
                {tab.icon}
                <span>{tab.label}</span>
              </Link>
            ) : (
              <span key={tab.key} className={baseClasses} aria-disabled="true">
                {tab.icon}
                {tab.label}
              </span>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            className="p-2 rounded-full hover:bg-white/15 transition-colors"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            className="p-2 rounded-full hover:bg-white/15 transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-white" />
          </button>

          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1 rounded-full hover:bg-white/15 transition-colors"
              aria-label="User menu"
            >
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-white text-sm font-semibold">
                  {displayInitial}
                </span>
              </div>
              <span className="text-sm text-white hidden xl:block">
                {displayName}
              </span>
              <ChevronDown className="w-4 h-4 text-white hidden xl:block" />
            </button>

            {showUserMenu && (
              <div className="absolute top-full right-0 mt-2 bg-white rounded-[6px] shadow-lg border border-gray-200 py-2 z-50 min-w-48">
                <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
                  Account
                </div>
                <Link
                  href="/settings"
                  className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  onClick={() => setShowUserMenu(false)}
                >
                  <UserCircle className="w-4 h-4 mr-2" />
                  Profile
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  onClick={() => setShowUserMenu(false)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Link>
                <div className="px-3 py-2 border-t border-gray-100">
                  <button
                    onClick={async () => {
                      setShowUserMenu(false);
                      await signOut();
                      router.push('/login');
                    }}
                    className="flex items-center text-sm text-red-600 hover:text-red-700 transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
