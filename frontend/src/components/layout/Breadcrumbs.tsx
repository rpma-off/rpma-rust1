'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';

interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

export function Breadcrumbs({ className }: { className?: string }) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const breadcrumbs = generateBreadcrumbs(pathname, t);

  if (breadcrumbs.length === 0) return null;

  return (
    <nav className={cn('flex items-center gap-2 text-sm', className)} aria-label="Breadcrumb">
      {breadcrumbs.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
          {item.current ? (
            <span className="text-gray-900 font-medium">{item.label}</span>
          ) : item.href ? (
            <Link
              href={item.href}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-600">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}

function generateBreadcrumbs(pathname: string, t: (key: string) => string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return [{ label: t('nav.home'), href: '/dashboard', current: pathname === '/dashboard' }];
  }

  const items: BreadcrumbItem[] = [];
  let currentPath = '';

  items.push({ label: t('nav.home'), href: '/dashboard' });

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === segments.length - 1;
    const label = getBreadcrumbLabel(segment, currentPath, segments, index, t);

    if (label) {
      items.push({
        label,
        href: isLast ? undefined : currentPath,
        current: isLast,
      });
    }
  });

  return items;
}

function getBreadcrumbLabel(
  segment: string,
  _currentPath: string,
  _allSegments: string[],
  _index: number,
  t: (key: string) => string
): string | null {
  const segmentLower = segment.toLowerCase();

  const pathMap: Record<string, string> = {
    'dashboard': t('nav.dashboard'),
    'tasks': t('nav.tasks'),
    'new': 'Nouveau',
    'calendar': t('nav.schedule'),
    'clients': t('nav.clients'),
    'analytics': 'Analyses',
    'inventory': t('nav.inventory'),
    'data-explorer': t('nav.dataExplorer'),
    'reports': t('nav.reports'),
    'admin': t('nav.admin'),
    'settings': t('nav.settings'),
    'configuration': t('nav.configuration'),
    'audit': t('nav.audit'),
    'users': t('nav.users'),
    'team': t('nav.team'),
    'technicians': t('nav.technicians'),
    'schedule': t('nav.schedule'),
    'messages': t('nav.messages'),
    'bootstrap-admin': 'Configuration initiale',
    'unauthorized': 'Non autorisé',
    'login': 'Connexion',
    'signup': 'Inscription',
    'theme-test': 'Test de thème',
  };

  if (pathMap[segmentLower]) {
    return pathMap[segmentLower];
  }

  if (/^\d+$/.test(segment)) {
    return 'Détails';
  }

  if (segmentLower === 'edit') {
    return 'Modifier';
  }

  if (segmentLower === 'completed') {
    return 'Terminée';
  }

  if (segmentLower === 'workflow') {
    return 'Workflow';
  }

  if (segmentLower === 'steps') {
    return 'Étapes';
  }

  if (segmentLower === 'ppf') {
    return 'PPF';
  }

  if (segmentLower === 'preparation') {
    return 'Préparation';
  }

  if (segmentLower === 'installation') {
    return 'Installation';
  }

  if (segmentLower === 'inspection') {
    return 'Inspection';
  }

  if (segmentLower === 'finalization') {
    return 'Finalisation';
  }

  if (segmentLower === 'operational-intelligence') {
    return 'Intelligence opérationnelle';
  }

  if (segmentLower === 'interventions') {
    return 'Interventions';
  }

  return segment.charAt(0).toUpperCase() + segment.slice(1);
}
