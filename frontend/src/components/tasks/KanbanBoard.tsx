'use client';

import { useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { StatusColumn } from './StatusColumn';
import { TaskCard } from './TaskCard';
import { useTaskStatus } from '@/hooks/useTaskStatus';
import type { Task } from '@/lib/backend';

const STATUS_COLUMNS = [
  { id: 'quote', label: 'QUOTES', color: 'bg-gray-500' },
  { id: 'scheduled', label: 'SCHEDULED', color: 'bg-blue-500' },
  { id: 'in_progress', label: 'IN PROGRESS', color: 'bg-yellow-500' },
  { id: 'paused', label: 'PAUSED', color: 'bg-purple-500' },
  { id: 'completed', label: 'COMPLETED', color: 'bg-green-500' },
  { id: 'cancelled', label: 'CANCELLED', color: 'bg-red-500' },
];

export function KanbanBoard() {
  const { tasks, loading, error, distribution, transitionStatus } = useTaskStatus();

  const tasksByStatus = useMemo(() => {
    const grouped = new Map<string, Task[]>();
    STATUS_COLUMNS.forEach(col => grouped.set(col.id, []));

    tasks.forEach(task => {
      const existing = grouped.get(task.status) || [];
      grouped.set(task.status, [...existing, task]);
    });

    return grouped;
  }, [tasks]);

  const handleDragEnd = async (result: DropResult) => {
    const { draggableId, destination, source } = result;

    // Dropped outside valid area
    if (!destination) {
      return;
    }

    // Dropped in same location
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Get the new status from destination droppableId
    const newStatus = destination.droppableId;

    // Transition the task status
    await transitionStatus(draggableId, newStatus, 'Moved via Kanban board');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Status count header */}
      <div className="grid grid-cols-6 gap-4 p-4 border-b bg-muted/50">
        {STATUS_COLUMNS.map(col => (
          <div key={col.id} className="text-center">
            <div className="text-sm font-medium text-muted-foreground">
              {col.label}
            </div>
            <div className="text-2xl font-bold">
              {distribution ? distribution[col.id as keyof typeof distribution] || 0 : 0}
            </div>
          </div>
        ))}
      </div>

      {/* Kanban columns */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-6 gap-4 p-4 flex-1 overflow-hidden">
          {STATUS_COLUMNS.map(column => {
            const columnTasks = tasksByStatus.get(column.id) || [];

            return (
              <Droppable key={column.id} droppableId={column.id}>
                {(provided, snapshot) => (
                  <StatusColumn
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    title={column.label}
                    count={columnTasks.length}
                    color={column.color}
                    isDraggingOver={snapshot.isDraggingOver}
                  >
                    {columnTasks.map((task, index) => (
                      <Draggable
                        key={task.id}
                        draggableId={task.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={snapshot.isDragging ? 'opacity-50' : ''}
                          >
                            <TaskCard task={task} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </StatusColumn>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}