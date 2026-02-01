'use client';

import React from 'react';
import { ChecklistView } from './TaskInfo/ChecklistView';
import { ChecklistItem } from '@/types/task.types';
import { TaskStatus } from '@/lib/backend';

export interface TaskChecklistProps {
  items?: ChecklistItem[];
  taskId?: string;
  status?: TaskStatus;
  onItemChange?: (itemId: string, completed: boolean) => void;
  readOnly?: boolean;
}

/**
 * Task checklist wrapper component
 */
export function TaskChecklist({ items = [], taskId: _taskId, status: _status, onItemChange, readOnly = false }: TaskChecklistProps) {
  return (
    <ChecklistView
      items={items}
      onItemChange={onItemChange}
      readOnly={readOnly}
    />
  );
}

export default TaskChecklist;