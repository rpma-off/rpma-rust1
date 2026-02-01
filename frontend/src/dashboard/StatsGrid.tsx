'use client';

import React from 'react';
import { StatsGridProps } from './types';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Users, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

export const StatsGrid: React.FC<StatsGridProps> = ({ stats, className }) => {
  const statCards = [
    {
      label: 'Total Tasks',
      value: stats.total,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      label: 'Completed',
      value: stats.completed,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      label: 'In Progress',
      value: stats.inProgress,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      label: 'Pending',
      value: stats.pending,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    }
  ];

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {statCards.map((stat) => (
        <Card key={stat.label} className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
            <div className={cn('p-2 rounded-lg', stat.bgColor)}>
              <stat.icon className={cn('h-6 w-6', stat.color)} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
