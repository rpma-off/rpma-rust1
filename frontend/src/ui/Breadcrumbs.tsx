'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  current?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
  showHome?: boolean;
  separator?: React.ReactNode;
}

export default function Breadcrumbs({ 
  items, 
  className,
  showHome = true,
  separator = <ChevronRight className="h-4 w-4 text-gray-400" />
}: BreadcrumbsProps) {
  const allItems = showHome 
    ? [{ label: 'Accueil', href: '/', icon: <Home className="h-4 w-4" /> }, ...items]
    : items;

  return (
    <nav 
      className={cn(
        "flex items-center space-x-2 text-sm text-gray-600 mb-4",
        className
      )}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center space-x-2">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          
          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <span className="mx-2 select-none">
                  {separator}
                </span>
              )}
              
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="flex items-center space-x-1 hover:text-gray-900 transition-colors duration-200"
                >
                  {item.icon && (
                    <span className="text-gray-500">
                      {item.icon}
                    </span>
                  )}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span 
                  className={cn(
                    "flex items-center space-x-1",
                    isLast ? "text-gray-900 font-medium" : "text-gray-600"
                  )}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.icon && (
                    <span className={isLast ? "text-gray-700" : "text-gray-500"}>
                      {item.icon}
                    </span>
                  )}
                  <span>{item.label}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Hook pour générer automatiquement les breadcrumbs basés sur l'URL
export function useBreadcrumbs(pathname: string, customLabels?: Record<string, string>) {
  const segments = pathname.split('/').filter(Boolean);
  
  const items: BreadcrumbItem[] = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const isLast = index === segments.length - 1;
    
    // Labels personnalisés ou formatage par défaut
    let label = customLabels?.[segment] || segment;
    
    // Formatage spécial pour certains patterns
    if (segment === 'tasks') {
      label = 'Tâches';
    } else if (segment === 'workflow') {
      label = 'Workflow';
    } else if (segment.startsWith('step-')) {
      const stepNumber = segment.replace('step-', '');
      label = `Étape ${stepNumber}`;
    } else if (segment === 'checklist') {
      label = 'Checklist';
    } else if (segment === 'completed') {
      label = 'Terminé';
    } else if (segment === 'start') {
      label = 'Démarrage';
    } else if (/^[a-f0-9-]{36}$/.test(segment)) {
      // UUID pattern - probablement un ID de tâche
      label = `Tâche #${segment.slice(-8)}`;
    }

    return {
      label,
      href: isLast ? undefined : href,
      current: isLast
    };
  });

  return items;
}

// Composant spécialisé pour les workflow
interface WorkflowBreadcrumbsProps {
  taskId: string;
  taskTitle?: string;
  currentStep?: string;
  className?: string;
}

export function WorkflowBreadcrumbs({
  taskId,
  taskTitle,
  currentStep,
  className
}: WorkflowBreadcrumbsProps) {
  const items: BreadcrumbItem[] = [
    {
      label: 'Tâches',
      href: '/tasks'
    },
    {
      label: taskTitle || `Tâche #${taskId.slice(-8)}`,
      href: `/tasks/${taskId}`
    },
    {
      label: 'Workflow',
      href: `/tasks/${taskId}/workflow`
    }
  ];

  if (currentStep) {
    const stepNumber = currentStep.replace('step-', '');
    items.push({
      label: `Étape ${stepNumber}`,
      current: true
    });
  }

  return (
    <Breadcrumbs 
      items={items}
      className={className}
      showHome={true}
    />
  );
}