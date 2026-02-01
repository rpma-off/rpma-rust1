'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { ChecklistItem } from '@/types/task.types';

export interface ChecklistProgressProps {
  taskId: string;
  checklistItems: ChecklistItem[];
  onItemUpdate?: (itemId: string, completed: boolean) => void;
}

/**
 * Component to display and manage checklist progress
 */
export function ChecklistProgress({ taskId, checklistItems, onItemUpdate }: ChecklistProgressProps) {
  const totalItems = checklistItems.length;
  const completedItems = checklistItems.filter(item => item.is_completed).length;
  const progressPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  const handleItemToggle = (itemId: string, completed: boolean) => {
    if (onItemUpdate) {
      onItemUpdate(itemId, completed);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progression de la Checklist</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Progress value={progressPercentage} className="w-full" />
          <div className="text-sm text-muted-foreground">
            {completedItems} sur {totalItems} éléments complétés
          </div>

          {checklistItems.length > 0 && (
            <div className="space-y-2 mt-4">
              {checklistItems.map((item) => (
                <div key={item.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`checklist-${item.id}`}
                    checked={item.is_completed}
                    onCheckedChange={(checked) => handleItemToggle(item.id, checked as boolean)}
                  />
                  <label
                    htmlFor={`checklist-${item.id}`}
                    className={`text-sm ${item.is_completed ? 'line-through text-muted-foreground' : ''}`}
                  >
                    {item.description}
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default ChecklistProgress;