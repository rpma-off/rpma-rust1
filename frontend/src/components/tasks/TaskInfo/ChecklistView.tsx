'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ChecklistItem } from '@/types/task.types';

export interface ChecklistViewProps {
  items: ChecklistItem[];
  onItemChange?: (itemId: string, completed: boolean) => void;
  onItemUpdate?: (itemId: string, updates: Partial<ChecklistItem>) => Promise<void>;
  readOnly?: boolean;
}

/**
 * Component to display and edit checklist items
 */
export function ChecklistView({ items, onItemChange, readOnly = false }: ChecklistViewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Checklist de la Tâche</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center space-x-2">
              <Checkbox
                id={item.id}
                checked={item.is_completed || false}
                onCheckedChange={(checked) => {
                  if (!readOnly && onItemChange) {
                    onItemChange(item.id, checked as boolean);
                  }
                }}
                disabled={readOnly}
              />
              <label
                htmlFor={item.id}
                className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
                  item.is_completed ? 'line-through text-muted-foreground' : ''
                }`}
              >
                {item.description}
              </label>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}