'use client';

import React from 'react';
import { Car, Users, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEntityCounts } from '@/hooks/useEntityCounts';
import type { EntityType } from '@/lib/backend';

interface EntitySelectorProps {
  selectedType: EntityType;
  onTypeChange: (type: EntityType) => void;
}

export function EntitySelector({ selectedType, onTypeChange }: EntitySelectorProps) {
  const { counts, loading } = useEntityCounts();

  const entities = [
    {
      id: 'task' as EntityType,
      label: 'Tâches',
      icon: <Car className="h-4 w-4" />,
      description: 'Rechercher dans les tâches PPF',
      count: loading ? '...' : (counts?.tasks || 0).toLocaleString()
    },
    {
      id: 'client' as EntityType,
      label: 'Clients',
      icon: <Users className="h-4 w-4" />,
      description: 'Rechercher dans les clients',
      count: loading ? '...' : (counts?.clients || 0).toLocaleString()
    },
    {
      id: 'intervention' as EntityType,
      label: 'Interventions',
      icon: <FileText className="h-4 w-4" />,
      description: 'Rechercher dans les interventions',
      count: loading ? '...' : (counts?.interventions || 0).toLocaleString()
    }
  ];

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-foreground">Type d&apos;entité</h4>
      <div className="flex flex-wrap gap-3">
        {entities.map((entity) => {
          const isSelected = selectedType === entity.id;
          const getColors = () => {
            switch (entity.id) {
              case 'task':
                return isSelected
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/50 hover:bg-blue-500/30'
                  : 'border-border/50 text-muted-foreground hover:border-blue-500/30 hover:text-blue-400 hover:bg-blue-500/5';
              case 'client':
                return isSelected
                  ? 'bg-green-500/20 text-green-400 border-green-500/50 hover:bg-green-500/30'
                  : 'border-border/50 text-muted-foreground hover:border-green-500/30 hover:text-green-400 hover:bg-green-500/5';
              case 'intervention':
                return isSelected
                  ? 'bg-purple-500/20 text-purple-400 border-purple-500/50 hover:bg-purple-500/30'
                  : 'border-border/50 text-muted-foreground hover:border-purple-500/30 hover:text-purple-400 hover:bg-purple-500/5';
              default:
                return isSelected
                  ? 'bg-primary/20 text-primary border-primary/50 hover:bg-primary/30'
                  : 'border-border/50 text-muted-foreground hover:border-primary/30 hover:text-primary hover:bg-primary/5';
            }
          };

          return (
            <Button
              key={entity.id}
              variant="outline"
              size="sm"
              onClick={() => onTypeChange(entity.id)}
              className={`flex items-center gap-3 px-4 py-3 h-auto transition-all duration-200 ${getColors()}`}
            >
              {entity.icon}
              <div className="flex flex-col items-start">
                <span className="font-medium">{entity.label}</span>
                <span className="text-xs opacity-75">{entity.count}</span>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}