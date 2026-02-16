'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Menu, Search, X, CalendarDays, Wrench, FileText, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

interface TopbarProps {
  onMenuToggle: () => void;
  onSidebarToggle: () => void;
  isSidebarOpen: boolean;
}

export function Topbar({ onMenuToggle, onSidebarToggle, isSidebarOpen }: TopbarProps) {
  const { t } = useTranslation();

  const navTabs = [
    { key: 'calendar', label: t('nav.schedule'), href: '/dashboard', enabled: true, icon: <CalendarDays className="h-4 w-4" /> },
    { key: 'jobs', label: t('nav.tasks'), href: '/tasks', enabled: true, icon: <Wrench className="h-4 w-4" /> },
    { key: 'proposals', label: t('nav.proposals'), href: '/quotes', enabled: true, icon: <FileText className="h-4 w-4" /> },
    { key: 'customers', label: t('nav.clients'), href: '/clients', enabled: true, icon: <Users className="h-4 w-4" /> },
  ];
  const pathname = usePathname();

  const activeTab = (() => {
    if (pathname === '/dashboard') return 'calendar';
    if (pathname.startsWith('/tasks') || pathname.startsWith('/interventions')) return 'jobs';
    if (pathname.startsWith('/quotes')) return 'proposals';
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
        </div>
      </div>
    </header>
  );
}
