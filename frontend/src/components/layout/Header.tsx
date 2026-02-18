'use client';

import { useState, useRef, useEffect } from 'react';
import { useLayoutStore } from '@/lib/stores/layoutStore';
import { useAuth } from '@/domains/auth';
import { Menu, Search, Star, Bell, X, RefreshCw, UserCircle, Settings, LogOut } from 'lucide-react';
import { Breadcrumbs } from './Breadcrumbs';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { SyncIndicator } from '@/components/ui/SyncIndicator';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title?: string;
  vehicle?: string;
  customer_name?: string;
}

interface HeaderProps {
  isDesktop?: boolean;
  tasks?: Task[];
  onCreateTask?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function Header({ 
  isDesktop = true, 
  tasks = [],
  onCreateTask,
  onRefresh,
  isRefreshing = false
}: HeaderProps) {
  const { toggleSidebar } = useLayoutStore();
  const { user: _user, profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
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
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showSearchResults]);

  const filteredTasks = tasks.filter(task =>
    task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.vehicle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const searchResults = searchQuery.length >= 2 ? filteredTasks.slice(0, 5) : [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
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
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showSearchResults]);

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center sticky top-0 z-20">
      <div className="flex items-center flex-1 min-w-0">
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
        
        <div className="ml-4 min-w-0 flex-1">
          <Breadcrumbs className="text-gray-600" />
        </div>
      </div>

      <div className="flex-1 flex justify-center px-4">
        <div 
          ref={searchContainerRef}
          className={cn(
            'relative w-full max-w-md transition-all duration-200',
            searchFocused && 'scale-105'
          )}
        >
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className={cn('w-4 h-4 transition-colors', searchFocused ? 'text-teal-500' : 'text-gray-400')} />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Rechercher..."
            className={cn(
              'w-full bg-gray-100 rounded-full py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400',
              'focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white',
              'transition-all duration-200'
            )}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              setSearchFocused(true);
              if (searchQuery.length >= 2) setShowSearchResults(true);
            }}
            onBlur={() => setTimeout(() => setShowSearchResults(false), 150)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {!searchQuery && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none hidden sm:flex">
              <kbd className="text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">
                ⌘K
              </kbd>
            </div>
          )}

          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
              <div className="p-2">
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Résultats ({searchResults.length})
                </div>
                {searchResults.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => {
                      window.location.href = `/tasks/${task.id}`;
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
      </div>

      <div className="flex items-center justify-end gap-3 flex-1">
        <button className="p-2 text-gray-500 hover:text-teal-600 transition-colors">
          <Star className="w-5 h-5" />
        </button>
        
        <div className="relative">
          <button className="p-2 text-gray-500 hover:text-teal-600 transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </div>

        <div className="h-6 w-px bg-gray-300 mx-2" />

        <div className="flex items-center gap-2">
          <button 
            onClick={onRefresh}
            className="p-2 text-gray-500 hover:text-teal-600 transition-colors disabled:opacity-50"
            disabled={isRefreshing}
            title="Rafraîchir"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <ThemeToggle />
          <SyncIndicator />
          
          <div className="relative" ref={userMenuRef}>
            <button 
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                <span className="text-white text-sm font-semibold">
                  {profile?.first_name?.charAt(0) || 'U'}
                </span>
              </div>
              <span className="text-sm text-gray-700">
                {profile?.first_name} {profile?.last_name}
              </span>
            </button>
            
            {showUserMenu && (
              <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 min-w-48">
                <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
                  Compte
                </div>
                <a href="/settings" className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                  <UserCircle className="w-4 h-4 mr-2" />
                  Profil
                </a>
                <a href="/settings" className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                  <Settings className="w-4 h-4 mr-2" />
                  Paramètres
                </a>
                <div className="px-3 py-2 border-t border-gray-100">
                  <button
                    onClick={() => {
                      // Implement logout
                    }}
                    className="flex items-center text-sm text-red-600 hover:text-red-700 transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Se déconnecter
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {!isDesktop && onCreateTask && (
          <Button
            onClick={onCreateTask}
            className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium"
          >
            + Nouvelle
          </Button>
        )}
      </div>
    </header>
  );
}
