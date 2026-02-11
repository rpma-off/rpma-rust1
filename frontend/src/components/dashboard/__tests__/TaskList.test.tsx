import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskList } from '../TaskList';
import type { DashboardTask } from '../types';

jest.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getTotalSize: () => 240,
    getVirtualItems: () => [
      { index: 0, start: 0, size: 120 },
      { index: 1, start: 120, size: 120 },
    ],
  }),
}));

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

describe('TaskList', () => {
  it('shows the empty state when no tasks are available', () => {
    render(<TaskList tasks={[]} />);

    expect(screen.getByText('Aucune tâche trouvée')).toBeInTheDocument();
  });

  it('renders virtualized tasks and handles clicks', () => {
    const onTaskClick = jest.fn();
    const tasks = [
      baseTask,
      { ...baseTask, id: 'task-2', title: 'Contrôle qualité' },
    ];

    render(<TaskList tasks={tasks} onTaskClick={onTaskClick} />);

    const taskTitle = screen.getByText('Installation PPF');
    fireEvent.click(taskTitle);

    expect(onTaskClick).toHaveBeenCalledWith('task-1');
    expect(screen.getByText('Contrôle qualité')).toBeInTheDocument();
  });
});
