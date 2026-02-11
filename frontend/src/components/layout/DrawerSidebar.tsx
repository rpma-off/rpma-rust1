'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronRight, MessageSquare, Users, Package, Workflow, Settings, Activity, BarChart3, Trash2, X, LogOut, User, Shield, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/compatibility';
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

interface NavItem {
  href?: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

const mainItems: NavItem[] = [
  { href: '/messages', label: 'Message Center', icon: <MessageSquare className="h-5 w-5" /> },
  { href: '/team', label: 'Employees/Resources', icon: <Users className="h-5 w-5" /> },
  { href: '/inventory', label: 'Inventory', icon: <Package className="h-5 w-5" /> },
  { href: '/configuration', label: 'Integrations', icon: <Workflow className="h-5 w-5" /> },
  { href: '/settings', label: 'Preferences', icon: <Settings className="h-5 w-5" /> },
  { href: '/tasks', label: 'Workflows', icon: <Workflow className="h-5 w-5" /> },
  { href: '/interventions', label: 'Activity', icon: <Activity className="h-5 w-5" /> },
  { href: '/analytics', label: 'Analytics', icon: <BarChart3 className="h-5 w-5" /> },
  { label: 'Trash', icon: <Trash2 className="h-5 w-5" />, disabled: true },
];

const settingsItem: NavItem = { href: '/settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> };

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
        <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 cursor-pointer border-t border-[hsl(var(--rpma-border))] transition-colors duration-200">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 bg-gradient-to-br from-muted to-muted/80 ring-2 ring-background">
              <AvatarFallback className="text-foreground font-semibold text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground font-medium">Signed in as</div>
              <div className="text-sm font-semibold text-foreground truncate">{displayName}</div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        side="bottom" 
        sideOffset={4}
        className="w-72 bg-background border-border/20 shadow-xl"
      >
        <div className="px-3 py-3 border-b border-border/20">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 bg-gradient-to-br from-[hsl(var(--rpma-teal))] to-[hsl(var(--rpma-purple))]">
              <AvatarFallback className="text-white font-semibold text-sm">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[hsl(var(--rpma-teal))]/10 text-[hsl(var(--rpma-teal))] border border-[hsl(var(--rpma-teal))]/20">
              <Shield className="h-3 w-3 mr-1" />
              {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
            </span>
          </div>
        </div>

        <DropdownMenuSeparator className="bg-border/20" />

        <div className="py-1">
          <DropdownMenuItem 
            onClick={() => { onMobileClose?.(); router.push('/settings'); }}
            className="flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-muted/10 focus:bg-muted/10 cursor-pointer"
          >
            <User className="h-4 w-4 text-muted-foreground" />
            <span>Profile</span>
          </DropdownMenuItem>

          <DropdownMenuItem 
            onClick={() => { onMobileClose?.(); router.push('/settings'); }}
            className="flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-muted/10 focus:bg-muted/10 cursor-pointer"
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span>Settings</span>
          </DropdownMenuItem>

          <DropdownMenuItem 
            onClick={() => { onMobileClose?.(); router.push('/help'); }}
            className="flex items-center gap-3 px-3 py-2.5 text-sm text-foreground hover:bg-muted/10 focus:bg-muted/10 cursor-pointer"
          >
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            <span>Help & Support</span>
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="bg-border/20" />

        <DropdownMenuItem 
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer group"
        >
          <LogOut className="h-4 w-4 text-red-500 group-hover:text-red-600 transition-colors" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DrawerSidebar({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  const pathname = usePathname();

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === '/tasks' && pathname.startsWith('/tasks')) return true;
    if (href === '/team' && pathname.startsWith('/team')) return true;
    if (href === '/settings' && (pathname === '/settings' || pathname.startsWith('/configuration'))) return true;
    return pathname === href;
  };

  if (!isOpen) return null;

  return (
    <aside className="hidden lg:flex flex-col w-[280px] bg-white border-r border-[hsl(var(--rpma-border))]">
      <div className="h-[56px] flex items-center justify-between px-4 border-b border-[hsl(var(--rpma-border))]">
        <div className="text-2xl font-semibold text-gray-400 tracking-tight">CarePPF</div>
        <button
          onClick={onToggle}
          className="p-2 rounded-md hover:bg-muted/30 transition-colors"
          aria-label="Close sidebar"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="border-b border-[hsl(var(--rpma-border))]">
        <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
              R
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Business</div>
              <div className="text-sm font-semibold text-foreground">RPMA</div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
        <UserDropdown />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {mainItems.map((item) => {
          const itemClasses = cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors relative',
            isActive(item.href)
              ? 'bg-[hsl(var(--rpma-surface))] text-foreground font-semibold'
              : 'text-muted-foreground hover:bg-muted/20 hover:text-foreground',
            item.disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground',
            item.label === 'Message Center' && 'border border-border/60 justify-center gap-2 font-medium text-foreground'
          );

            const activeBar = isActive(item.href) ? (
              <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[hsl(var(--rpma-teal))]" />
            ) : null;

            return item.disabled ? (
              <div key={item.label} className={itemClasses} aria-disabled="true">
                {activeBar}
                {item.icon}
                <span>{item.label}</span>
              </div>
            ) : (
              <Link key={item.label} href={item.href || '#'} className={itemClasses}>
                {activeBar}
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
        })}
      </nav>

      <div className="border-t border-[hsl(var(--rpma-border))] p-4">
        <Link
          href={settingsItem.href || '#'}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
            isActive(settingsItem.href)
              ? 'bg-[hsl(var(--rpma-surface))] text-foreground font-semibold'
              : 'text-muted-foreground hover:bg-muted/20 hover:text-foreground'
          )}
        >
          {settingsItem.icon}
          <span>{settingsItem.label}</span>
        </Link>
      </div>
    </aside>
  );
}

export function DrawerSidebarMobile({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === '/tasks' && pathname.startsWith('/tasks')) return true;
    if (href === '/team' && pathname.startsWith('/team')) return true;
    if (href === '/settings' && (pathname === '/settings' || pathname.startsWith('/configuration'))) return true;
    return pathname === href;
  };

  if (!isOpen) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute left-0 top-0 h-full w-[280px] bg-white shadow-lg">
        <div className="h-[56px] flex items-center justify-between px-4 border-b border-[hsl(var(--rpma-border))]">
          <div className="text-2xl font-semibold text-gray-400 tracking-tight">urable</div>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-muted/30 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="border-b border-[hsl(var(--rpma-border))]">
          <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
                R
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Business</div>
                <div className="text-sm font-semibold text-foreground">RPMA</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <UserDropdown onMobileClose={onClose} />
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {mainItems.map((item) => {
            const itemClasses = cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors relative',
              isActive(item.href)
                ? 'bg-[hsl(var(--rpma-surface))] text-foreground font-semibold'
                : 'text-muted-foreground hover:bg-muted/20 hover:text-foreground',
              item.disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground',
              item.label === 'Message Center' && 'border border-border/60 justify-center gap-2 font-medium text-foreground'
            );

            const activeBar = isActive(item.href) ? (
              <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[hsl(var(--rpma-teal))]" />
            ) : null;

            return item.disabled ? (
              <div key={item.label} className={itemClasses} aria-disabled="true">
                {activeBar}
                {item.icon}
                <span>{item.label}</span>
              </div>
            ) : (
              <Link key={item.label} href={item.href || '#'} className={itemClasses} onClick={onClose}>
                {activeBar}
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[hsl(var(--rpma-border))] p-4">
          <Link
            href={settingsItem.href || '#'}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              isActive(settingsItem.href)
                ? 'bg-[hsl(var(--rpma-surface))] text-foreground font-semibold'
                : 'text-muted-foreground hover:bg-muted/20 hover:text-foreground'
            )}
            onClick={onClose}
          >
            {settingsItem.icon}
            <span>{settingsItem.label}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
