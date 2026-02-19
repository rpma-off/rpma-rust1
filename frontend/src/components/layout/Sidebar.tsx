'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/domains/auth';
import type { UserAccount } from '@/types/auth.types';
import type { UserSession } from '@/lib/backend';
import { useRouter } from 'next/navigation';
import {
  Car,
  Calendar,
  Users,
  BarChart3,
  Package,
  Database,
  BarChart2,
  Settings,
  Shield,
  HelpCircle,
  LogOut,
  FileText,
  UserCircle,
  Activity,
} from 'lucide-react';
import { useLayoutStore } from '@/lib/stores/layoutStore';
import { AnimatePresence, motion } from 'framer-motion';

interface SidebarProps {
  isMobile?: boolean;
  onClose?: () => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

export function Sidebar({ isMobile = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const { isSidebarCollapsed } = useLayoutStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navItems: NavItem[] = [
    { href: '/dashboard', label: 'Calendrier', icon: <Calendar className="w-5 h-5" /> },
    { href: '/tasks', label: 'Tâches', icon: <Car className="w-5 h-5" /> },
    { href: '/clients', label: 'Clients', icon: <Users className="w-5 h-5" /> },
    { href: '/interventions', label: 'Interventions', icon: <Activity className="w-5 h-5" /> },
    { href: '/analytics', label: 'Analyses', icon: <BarChart3 className="w-5 h-5" /> },
    { href: '/inventory', label: 'Matériel & Stock', icon: <Package className="w-5 h-5" /> },
    { href: '/data-explorer', label: 'Explorateur de données', icon: <Database className="w-5 h-5" /> },
    { href: '/reports', label: 'Rapports', icon: <BarChart2 className="w-5 h-5" /> },
  ];

  const bottomNavItems: NavItem[] = [
    { href: '/settings', label: 'Paramètres', icon: <Settings className="w-5 h-5" /> },
  ];

  const adminNavItems: NavItem[] = [
    { href: '/admin', label: 'Administration', icon: <Shield className="w-5 h-5" />, adminOnly: true },
    { href: '/audit', label: 'Audit', icon: <FileText className="w-5 h-5" />, adminOnly: true },
  ];

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const handleNavClick = (_href: string) => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  return (
    <motion.aside
      initial={isMobile ? { x: '-100%' } : false}
      animate={isMobile ? { x: 0 } : {}}
      exit={isMobile ? { x: '-100%' } : {}}
      className={`
        h-full flex flex-col
        ${isMobile ? 'fixed z-50 w-80' : 'relative'}
        bg-[#1E293B] text-white
        ${isSidebarCollapsed && !isMobile ? 'w-20' : 'w-64'}
        transition-all duration-300
      `}
    >
      {!isMobile && <SidebarOverlay isCollapsed={isSidebarCollapsed} />}

      <div className="flex flex-col h-full">
        <LogoSection isCollapsed={isSidebarCollapsed} />

        <nav className="flex-1 px-2 py-4 overflow-y-auto">
          <div className="space-y-1">
            {navItems.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={isActive(item.href)}
                collapsed={isSidebarCollapsed && !isMobile}
                onClick={() => handleNavClick(item.href)}
              />
            ))}
          </div>

          {user?.role === 'admin' || user?.role === 'supervisor' ? (
            <div className="mt-6 space-y-1">
              {isSidebarCollapsed && !isMobile && <AdminSeparator collapsed />}
              {adminNavItems.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={isActive(item.href)}
                  collapsed={isSidebarCollapsed && !isMobile}
                  onClick={() => handleNavClick(item.href)}
                />
              ))}
            </div>
          ) : null}

          <div className="mt-6 space-y-1">
            {isSidebarCollapsed && !isMobile && <AdminSeparator collapsed />}
            {bottomNavItems.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={isActive(item.href)}
                collapsed={isSidebarCollapsed && !isMobile}
                onClick={() => handleNavClick(item.href)}
              />
            ))}
          </div>
        </nav>

        <div className="border-t border-[#334155]">
          <FooterSection
            isCollapsed={isSidebarCollapsed && !isMobile}
            user={user}
            profile={profile}
            onSignOut={handleSignOut}
            showUserMenu={showUserMenu}
            setShowUserMenu={setShowUserMenu}
          />
        </div>
      </div>
    </motion.aside>
  );
}

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  collapsed: boolean;
  onClick?: () => void;
}

function NavItem({ href, label, icon, active, collapsed, onClick }: NavItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`
        flex items-center px-3 py-2.5 rounded-md transition-all duration-200
        ${active 
          ? 'bg-[#334155] text-white border-l-4 border-[#14B8A6]' 
          : 'text-[#94A3B8] hover:bg-[#334155]/50 hover:text-white'
        }
        ${collapsed ? 'justify-center' : ''}
      `}
    >
      <span className={collapsed ? '' : 'mr-3'}>{icon}</span>
      {!collapsed && <span className="text-sm font-medium">{label}</span>}
    </Link>
  );
}

interface LogoSectionProps {
  isCollapsed: boolean;
}

function LogoSection({ isCollapsed }: LogoSectionProps) {
  return (
    <div className="flex items-center px-4 py-6 border-b border-[#334155]">
      <div className="bg-teal-500 rounded-full h-10 w-10 flex items-center justify-center flex-shrink-0">
        <Activity className="h-6 w-6 text-white" />
      </div>
      {!isCollapsed && <span className="ml-3 text-xl font-bold">RPMA</span>}
    </div>
  );
}

interface AdminSeparatorProps {
  collapsed?: boolean;
}

function AdminSeparator({ collapsed = false }: AdminSeparatorProps) {
  return (
    <div className={collapsed ? 'px-2 py-2' : 'px-3 py-2'}>
      {!collapsed && <span className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Admin</span>}
      {collapsed && <div className="h-px bg-[#334155] my-2" />}
    </div>
  );
}

interface FooterSectionProps {
  isCollapsed: boolean;
  user: UserSession | null;
  profile: UserAccount | null;
  onSignOut: () => void;
  showUserMenu: boolean;
  setShowUserMenu: (open: boolean) => void;
}

function FooterSection({ isCollapsed, user: _user, profile, onSignOut, showUserMenu, setShowUserMenu }: FooterSectionProps) {
  return (
    <div className="p-4 space-y-4">
      {!isCollapsed && (
        <>
          <Link
            href="/help"
            className="flex items-center text-sm text-[#94A3B8] hover:text-white transition-colors"
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            Aide & démarrage
          </Link>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center w-full p-3 rounded-lg bg-[#334155]/50 hover:bg-[#334155] transition-colors"
            >
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center overflow-hidden">
                <Image src="/images/logo.png" alt="Avatar" width={24} height={24} className="object-contain" />
              </div>
              <div className="ml-3 flex-1 text-left overflow-hidden">
                <p className="text-sm font-semibold text-white truncate">
                  {profile?.first_name} {profile?.last_name}
                </p>
                 <p className="text-xs text-[#94A3B8] truncate">{profile?.email}</p>
              </div>
              <LogOut className="w-4 h-4 text-[#94A3B8] hover:text-white transition-colors" />
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.15 }}
                   className="absolute bottom-full left-0 right-0 mb-2 bg-slate-900 rounded-lg border border-[#334155] shadow-xl overflow-hidden"
                >
                  <Link
                    href="/settings"
                     className="flex items-center px-4 py-3 text-sm text-slate-300 hover:bg-[#334155] hover:text-white transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <UserCircle className="w-4 h-4 mr-3" />
                    Profil
                  </Link>
                  <button
                    onClick={() => {
                      onSignOut();
                      setShowUserMenu(false);
                    }}
                    className="flex items-center w-full px-4 py-3 text-sm text-red-400 hover:bg-slate-700 hover:text-red-300 transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Se déconnecter
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}

      {isCollapsed && (
        <div className="flex flex-col items-center space-y-4">
            <button className="p-2 text-[#94A3B8] hover:text-white transition-colors">
            <HelpCircle className="w-5 h-5" />
          </button>
          <div className="relative group">
            <button className="h-9 w-9 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center overflow-hidden">
              <Image src="/images/logo.png" alt="Avatar" width={20} height={20} className="object-contain" />
            </button>
            <button
              onClick={onSignOut}
              className="mt-2 p-2 text-[#94A3B8] hover:text-white transition-colors"
              title="Se déconnecter"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface SidebarOverlayProps {
  isCollapsed: boolean;
}

function SidebarOverlay({ isCollapsed: _isCollapsed }: SidebarOverlayProps) {
  return null;
}
