'use client';

import React from 'react';
import { QuickActionsProps } from './types';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, Users, Settings } from 'lucide-react';

export const QuickActions: React.FC<QuickActionsProps> = ({ className }) => {
  const actions = [
    {
      label: 'Create Task',
      icon: Plus,
      onClick: () => window.location.href = '/tasks',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      label: 'Schedule',
      icon: Calendar,
      onClick: () => window.location.href = '/schedule',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      label: 'Team',
      icon: Users,
      onClick: () => window.location.href = '/team',
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      label: 'Settings',
      icon: Settings,
      onClick: () => window.location.href = '/settings',
      color: 'bg-muted hover:bg-muted/80'
    }
  ];

  return (
    <Card className={cn('p-6', className)}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <Button
            key={action.label}
            onClick={action.onClick}
            className={cn('flex items-center space-x-2', action.color)}
          >
            <action.icon className="h-4 w-4" />
            <span>{action.label}</span>
          </Button>
        ))}
      </div>
    </Card>
  );
};
