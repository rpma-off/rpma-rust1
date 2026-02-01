'use client';

import React from 'react';
import { PerformanceMetricsProps } from './types';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Target, Zap } from 'lucide-react';

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ metrics, className }) => {
  const performanceItems = [
    {
      label: 'Completion Rate',
      value: `${metrics.completionRate}%`,
      progress: metrics.completionRate,
      icon: Target,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      label: 'Average Progress',
      value: `${metrics.completionRate}%`,
      progress: metrics.completionRate,
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      label: 'Efficiency',
      value: `${metrics.efficiencyRate}%`,
      progress: metrics.efficiencyRate,
      icon: Zap,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  return (
    <Card className={cn('p-6', className)}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
      <div className="space-y-4">
        {performanceItems.map((item) => (
          <div key={item.label} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={cn('p-1 rounded', item.bgColor)}>
                  <item.icon className={cn('h-4 w-4', item.color)} />
                </div>
                <span className="text-sm font-medium text-gray-700">{item.label}</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{item.value}</span>
            </div>
            <Progress value={item.progress} className="h-2" />
          </div>
        ))}
      </div>
    </Card>
  );
};