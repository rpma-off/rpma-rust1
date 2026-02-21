"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Search, Filter, Download, Upload, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickActionsProps {
  onNewTask?: () => void;
  onSearch?: () => void;
  onFilter?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  onSettings?: () => void;
  className?: string;
}

export function QuickActions({
  onNewTask,
  onSearch,
  onFilter,
  onExport,
  onImport,
  onSettings,
  className
}: QuickActionsProps) {
  const actions = [
    {
      label: 'Nouvelle Tâche',
      icon: Plus,
      onClick: onNewTask,
      variant: 'default' as const,
      description: 'Créer une nouvelle tâche'
    },
    {
      label: 'Rechercher',
      icon: Search,
      onClick: onSearch,
      variant: 'outline' as const,
      description: 'Rechercher des tâches'
    },
    {
      label: 'Filtrer',
      icon: Filter,
      onClick: onFilter,
      variant: 'outline' as const,
      description: 'Appliquer des filtres'
    },
    {
      label: 'Exporter',
      icon: Download,
      onClick: onExport,
      variant: 'outline' as const,
      description: 'Exporter les données'
    },
    {
      label: 'Importer',
      icon: Upload,
      onClick: onImport,
      variant: 'outline' as const,
      description: 'Importer des données'
    },
    {
      label: 'Paramètres',
      icon: Settings,
      onClick: onSettings,
      variant: 'outline' as const,
      description: 'Configuration'
    }
  ];

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle className="text-lg">Actions Rapides</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.label}
                variant={action.variant}
                onClick={action.onClick}
                className="h-auto p-4 flex flex-col items-center gap-2 text-center"
              >
                <Icon className="h-6 w-6" />
                <div>
                  <div className="font-medium text-sm">{action.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {action.description}
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}