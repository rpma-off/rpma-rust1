'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { Search, Bell, ChevronDown, UserCircle, Settings, LogOut, X, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { SyncIndicator } from '@/components/ui/SyncIndicator';
import { useAuth } from '@/lib/auth/compatibility';

interface Task {
  id: string;
  title?: string;
  vehicle?: string;
  customer_name?: string;
}

interface RPMAHeaderProps {
  onMobileMenuToggle?: () => void;
  onSidebarToggle?: () => void;
  tasks?: Task[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
  isSidebarOpen?: boolean;
}

const navTabs = [
  { key: 'calendar', label: 'Calendar', href: '/dashboard', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg> },
  { key: 'jobs', label: 'Jobs', href: '/tasks', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.532 1.532 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.532 1.532 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg> },
  { key: 'customers', label: 'Customers', href: '/clients', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg> },
];

export function RPMAHeader({
  onMobileMenuToggle,
  onSidebarToggle,
  tasks = [],
  onRefresh,
  isRefreshing = false,
  isSidebarOpen = true
}: RPMAHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const filteredTasks = tasks.filter(task =>
    task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.vehicle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const searchResults = searchQuery.length >= 2 ? filteredTasks.slice(0, 5) : [];

  const getActiveTab = (path: string) => {
    if (path === '/dashboard') return 'calendar';
    if (path.startsWith('/tasks') || path.startsWith('/interventions')) return 'jobs';
    if (path.startsWith('/clients')) return 'customers';
    return 'calendar';
  };

  const activeTab = getActiveTab(pathname);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape' && showSearchResults) {
        setShowSearchResults(false);
        searchInputRef.current?.blur();
      }
      
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'H') {
        e.preventDefault();
        router.push('/dashboard');
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        router.push('/tasks');
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        router.push('/clients');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showSearchResults, router]);

  return (
    <header className="bg-[#1ad1ba] text-white h-[60px] flex items-center justify-between px-4 shadow-sm sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <button
          onClick={onSidebarToggle}
          className="p-2 rounded hover:bg-white/20 transition-colors focus:outline-none"
        >
          {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <nav className="hidden md:flex h-full space-x-1">
        {navTabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <a
              key={tab.key}
              href={tab.href}
              className={cn(
                'flex items-center space-x-2 px-6 h-full border-b-4 transition-all',
                isActive
                  ? 'border-white text-white font-semibold'
                  : 'border-transparent text-white/90 hover:bg-white/10 hover:text-white'
              )}
            >
              {tab.icon}
              <span className="uppercase tracking-wide text-sm">{tab.label}</span>
            </a>
          );
        })}
      </nav>

      <div className="flex items-center space-x-4">
        <div className="relative hidden md:block">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search..."
            className={cn(
              'bg-white/20 text-white placeholder-white/70 rounded-full py-1.5 px-4 text-sm w-48 focus:w-64 transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-white focus:bg-white/30'
            )}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              setSearchFocused(true);
              if (searchQuery.length >= 2) setShowSearchResults(true);
            }}
            onBlur={() => setTimeout(() => setShowSearchResults(false), 150)}
          />
          {!searchQuery && (
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/60 bg-white/20 px-1.5 py-0.5 rounded">
              ⌘K
            </kbd>
          )}
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute top-full right-0 mt-2 bg-white rounded-[6px] shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden min-w-64">
              <div className="p-2">
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Results ({searchResults.length})
                </div>
                {searchResults.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => {
                      router.push(`/tasks/${task.id}`);
                      setShowSearchResults(false);
                      setSearchQuery('');
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {task.title}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {task.vehicle} • {task.customer_name}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button className="p-2 rounded-full hover:bg-white/20 transition-colors focus:outline-none md:hidden">
          <Search className="h-6 w-6" />
        </button>

        <button className="p-2 rounded-full hover:bg-white/20 transition-colors focus:outline-none relative">
          <Bell className="h-6 w-6" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <div className="h-6 w-px bg-white/30 hidden md:block" />

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <SyncIndicator />

          <div className="relative hidden md:block" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1 hover:bg-white/20 rounded transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-white text-sm font-semibold">
                  {profile?.first_name?.charAt(0) || 'U'}
                </span>
              </div>
              <span className="text-sm text-white hidden xl:block">
                {profile?.first_name} {profile?.last_name}
              </span>
              <ChevronDown className="w-4 h-4 text-white hidden xl:block" />
            </button>

            {showUserMenu && (
              <div className="absolute top-full right-0 mt-2 bg-white rounded-[6px] shadow-lg border border-gray-200 py-2 z-50 min-w-48">
                <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
                  Account
                </div>
                <a href="/settings" className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                  <UserCircle className="w-4 h-4 mr-2" />
                  Profile
                </a>
                <a href="/settings" className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </a>
                <div className="px-3 py-2 border-t border-gray-100">
                  <button
                    onClick={() => {
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

          <div className="md:hidden">
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-white text-sm font-semibold">
                {profile?.first_name?.charAt(0) || 'U'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
