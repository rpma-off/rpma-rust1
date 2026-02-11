'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/compatibility';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Users,
  Package,
  Settings as SettingsIcon,
  Workflow,
  Activity,
  BarChart3,
  Moon,
  MessageSquare,
  X,
  ChevronRight,
  LogOut,
  User,
  Shield,
  HelpCircle,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { href: '/team', label: 'Employees/Resources', icon: <Users className="w-5 h-5" /> },
  { href: '/inventory', label: 'Inventory', icon: <Package className="w-5 h-5" /> },
  { href: '/configuration', label: 'Integrations', icon: <Workflow className="w-5 h-5" /> },
  { href: '/settings', label: 'Preferences', icon: <SettingsIcon className="w-5 h-5" /> },
  { href: '/tasks', label: 'Workflows', icon: <Workflow className="w-5 h-5" /> },
  { href: '/interventions', label: 'Activity', icon: <Activity className="w-5 h-5" /> },
  { href: '/analytics', label: 'Analytics', icon: <BarChart3 className="w-5 h-5" /> },
];

function UserDropdown({ onMobileClose }: { onMobileClose?: () => void }) {
  const { profile, signOut } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();

  const displayName = profile?.first_name && profile?.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : profile?.email || 'User';

  const initials = profile?.first_name?.charAt(0) || profile?.email?.charAt(0) || 'U';
  const userRole = profile?.role || 'viewer';

  const handleLogout = async () => {
    try {
      await signOut();
      queryClient.clear();
      toast.success('Logged out successfully');
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer border-t border-gray-100 transition-colors duration-200">
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8 bg-gradient-to-br from-gray-200 to-gray-300 ring-2 ring-white">
              <AvatarFallback className="text-gray-600 font-bold text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 font-medium">Signed in as</p>
              <p className="text-sm font-semibold text-gray-700 truncate">{displayName}</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400 transition-transform duration-200" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        side="bottom" 
        sideOffset={4}
        className="w-72 bg-white border-gray-200 shadow-xl"
      >
        <div className="px-3 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600">
              <AvatarFallback className="text-white font-semibold text-sm">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
              <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
              <Shield className="h-3 w-3 mr-1" />
              {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
            </span>
          </div>
        </div>

        <DropdownMenuSeparator className="bg-gray-100" />

        <div className="py-1">
          <DropdownMenuItem 
            onClick={() => { onMobileClose?.(); router.push('/settings'); }}
            className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 cursor-pointer"
          >
            <User className="h-4 w-4 text-gray-400" />
            <span>Profile</span>
          </DropdownMenuItem>

          <DropdownMenuItem 
            onClick={() => { onMobileClose?.(); router.push('/settings'); }}
            className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 cursor-pointer"
          >
            <SettingsIcon className="h-4 w-4 text-gray-400" />
            <span>Settings</span>
          </DropdownMenuItem>

          <DropdownMenuItem 
            onClick={() => { onMobileClose?.(); router.push('/help'); }}
            className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 cursor-pointer"
          >
            <HelpCircle className="h-4 w-4 text-gray-400" />
            <span>Help & Support</span>
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="bg-gray-100" />

        <DropdownMenuItem 
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 focus:bg-red-50 cursor-pointer group"
        >
          <LogOut className="h-4 w-4 text-red-500 group-hover:text-red-600 transition-colors" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function RPMASidebar({ onMobileClose, isOpen, onToggle }: { onMobileClose?: () => void; isOpen: boolean; onToggle: () => void }) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/tasks' && pathname === '/interventions') return true;
    if (href === '/settings' && pathname.startsWith('/configuration')) return true;
    if (href === '/tasks' && pathname.startsWith('/tasks')) return true;
    if (href === '/team' && pathname.startsWith('/team')) return true;
    if (href === '/technicians' && pathname.startsWith('/technicians')) return true;
    return pathname === href;
  };

  const NavButton = ({ item }: { item: NavItem }) => {
    return (
      <Button
        variant="ghost"
        className={cn(
          'w-full justify-start h-12 transition-all duration-200 px-2',
          isActive(item.href)
            ? 'bg-accent/10 text-accent font-medium'
            : 'text-muted-foreground hover:bg-muted/10 hover:text-foreground'
        )}
        onClick={() => onMobileClose?.()}
      >
        <span className="flex-shrink-0">{item.icon}</span>
        <span className="ml-3 text-sm">{item.label}</span>
      </Button>
    );
  };

  return (
    <TooltipProvider delayDuration={0}>
      {isOpen && (
        <aside className="hidden lg:flex flex-col bg-white border-r border-gray-200 flex-shrink-0 h-full overflow-y-auto w-[280px]">
          <div className="h-16 flex items-center justify-between px-4 border-b border-gray-50">
            <div className="text-2xl font-bold text-gray-400 tracking-tight">
              rpma
            </div>
            <div className="flex items-center gap-2">
              <button className="text-gray-400 hover:text-gray-600">
                <Moon className="h-5 w-5" />
              </button>
              <button
                onClick={onToggle}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

        <div className="flex flex-col border-b border-gray-100">
          <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer bg-gray-50/50">
            <div className="flex items-center space-x-3">
              <div className="bg-gray-200 rounded text-gray-500 font-bold h-8 w-8 flex items-center justify-center text-xs">R</div>
              <div>
                <p className="text-xs text-gray-400">Business</p>
                <p className="text-sm font-semibold text-gray-700">RPMA</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </div>
          <UserDropdown />
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          <Link href="/messages">
            <Button
              className={cn(
                'w-full flex items-center justify-center space-x-2 border border-border text-foreground rounded-[6px] py-2 mb-6 hover:bg-muted/10 font-medium transition-colors',
                isActive('/messages') ? 'bg-muted/10' : ''
              )}
              onClick={() => onMobileClose?.()}
            >
              <MessageSquare className="h-5 w-5" />
              <span>Message Center</span>
            </Button>
          </Link>

          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <NavButton item={item} />
            </Link>
          ))}
        </nav>

        <div className="border-t border-border p-4">
          <Link href="/settings">
            <Button
              variant="ghost"
              className={cn(
                'w-full justify-start h-10 transition-all duration-200 px-2',
                isActive('/settings') || isActive('/configuration')
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'text-muted-foreground hover:bg-muted/10 hover:text-foreground'
              )}
            >
              <SettingsIcon className="w-5 h-5 flex-shrink-0" />
              <span className="ml-3 text-sm">Settings</span>
            </Button>
          </Link>
        </div>
        </aside>
      )}
    </TooltipProvider>
  );
}

export function RPMAMobileSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/tasks' && pathname === '/interventions') return true;
    if (href === '/settings' && pathname.startsWith('/configuration')) return true;
    if (href === '/tasks' && pathname.startsWith('/tasks')) return true;
    if (href === '/team' && pathname.startsWith('/team')) return true;
    if (href === '/technicians' && pathname.startsWith('/technicians')) return true;
    return pathname === href;
  };

  return (
    <>
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm"
            onClick={onClose}
          />
            <div className="fixed left-0 top-0 bottom-0 w-[280px] bg-white overflow-y-auto transform transition-transform duration-300 ease-in-out">
            <div className="h-16 flex items-center justify-between px-4 border-b border-gray-50 bg-white">
              <div className="text-2xl font-bold text-gray-400 tracking-tight">
                rpma
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="flex flex-col border-b border-gray-100">
              <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer bg-gray-50/50">
                <div className="flex items-center space-x-3">
                  <div className="bg-gray-200 rounded text-gray-500 font-bold h-8 w-8 flex items-center justify-center text-xs">R</div>
                  <div>
                    <p className="text-xs text-gray-400">Business</p>
                    <p className="text-sm font-semibold text-gray-700">RPMA</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
              <UserDropdown onMobileClose={onClose} />
            </div>

            <nav className="flex-1 px-4 py-4 space-y-1">
              <Link href="/messages">
                <Button
                  className={cn(
                    'w-full flex items-center justify-center space-x-2 border border-border text-foreground rounded-[6px] py-2 mb-6 hover:bg-muted/10 font-medium transition-colors',
                    isActive('/messages') ? 'bg-muted/10' : ''
                  )}
                  onClick={onClose}
                >
                  <MessageSquare className="h-5 w-5" />
                  <span>Message Center</span>
                </Button>
              </Link>

              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                      'w-full justify-start h-12 transition-all duration-200 px-2',
                      isActive(item.href)
                        ? 'bg-accent/10 text-accent font-medium'
                        : 'text-muted-foreground hover:bg-muted/10 hover:text-foreground'
                    )}
                    onClick={onClose}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    <span className="ml-3 text-sm">{item.label}</span>
                  </Button>
                </Link>
              ))}
            </nav>

            <div className="border-t border-border p-4">
              <Link href="/settings">
                <Button
                  variant="ghost"
                  className={cn(
                    'w-full justify-start h-10 transition-all duration-200 px-2',
                    isActive('/settings') || isActive('/configuration')
                      ? 'bg-accent/10 text-accent font-medium'
                      : 'text-muted-foreground hover:bg-muted/10 hover:text-foreground'
                  )}
                  onClick={onClose}
                >
                  <SettingsIcon className="w-5 h-5 flex-shrink-0" />
                  <span className="ml-3 text-sm">Settings</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
