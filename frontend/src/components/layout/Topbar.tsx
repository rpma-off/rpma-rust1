'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Search, X, CalendarDays, Wrench, FileText, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { ROUTES } from '@/constants/routes';
import { NotificationBell } from '@/domains/notifications';
import { GlobalSearch } from './GlobalSearch';
import * as React from 'react';

interface TopbarProps {
  onMenuToggle: () => void;
  onSidebarToggle: () => void;
  isSidebarOpen: boolean;
}

export function Topbar({ onMenuToggle, onSidebarToggle, isSidebarOpen }: TopbarProps) {
  const { t } = useTranslation();
  const [searchOpen, setSearchOpen] = React.useState(false);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const navTabs = [
    { key: 'calendar', label: t('nav.schedule'), href: ROUTES.DASHBOARD, enabled: true, icon: <CalendarDays className="h-4 w-4" /> },
    { key: 'jobs', label: t('nav.tasks'), href: ROUTES.TASKS, enabled: true, icon: <Wrench className="h-4 w-4" /> },
    { key: 'proposals', label: t('nav.proposals'), href: ROUTES.QUOTES, enabled: true, icon: <FileText className="h-4 w-4" /> },
    { key: 'customers', label: t('nav.clients'), href: ROUTES.CLIENTS, enabled: true, icon: <Users className="h-4 w-4" /> },
  ];
  const pathname = usePathname();

  const activeTab = (() => {
    if (pathname === ROUTES.DASHBOARD) return 'calendar';
    if (pathname.startsWith(ROUTES.TASKS) || pathname.startsWith('/interventions')) return 'jobs';
    if (pathname.startsWith(ROUTES.QUOTES)) return 'proposals';
    if (pathname.startsWith(ROUTES.CLIENTS)) return 'customers';
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
            onClick={() => setSearchOpen(true)}
            className="p-2 rounded-full hover:bg-white/15 transition-colors"
            aria-label="Rechercher"
          >
            <Search className="h-5 w-5" />
          </button>
          <NotificationBell />
        </div>
      </div>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}
