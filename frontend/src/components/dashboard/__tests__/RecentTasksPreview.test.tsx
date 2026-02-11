import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecentTasksPreview } from '../RecentTasksPreview';
import type { DashboardTask } from '../types';

const baseTask: DashboardTask = {
  id: 'task-1',
  title: 'Installation PPF',
  vehicle: 'Vehicle A',
  zones: ['front'],
  technician: {
    id: 'tech-1',
    name: 'Alex Doe',
    initials: 'AD',
  },
  status: 'scheduled',
  priority: 'medium',
  startTime: null,
  endTime: null,
  scheduledDate: '2024-01-20',
  duration: null,
  progress: 0,
  checklistCompleted: false,
  photos: { before: [], after: [] },
  checklistItems: [],
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

describe('RecentTasksPreview', () => {
  it('shows an empty state when no tasks are provided', () => {
    render(<RecentTasksPreview tasks={[]} />);

    expect(screen.getByText('Aucune tâche récente à afficher.')).toBeInTheDocument();
  });

  it('renders tasks and handles task selection', () => {
    const onTaskClick = jest.fn();
    const tasks = [
      baseTask,
      {
        ...baseTask,
        id: 'task-2',
        title: 'Contrôle qualité',
      },
    ];

    render(<RecentTasksPreview tasks={tasks} onTaskClick={onTaskClick} />);

    const taskTitle = screen.getByText('Installation PPF');
    fireEvent.click(taskTitle);

    expect(onTaskClick).toHaveBeenCalledWith('task-1');
    expect(screen.getByText('Contrôle qualité')).toBeInTheDocument();
  });
});
