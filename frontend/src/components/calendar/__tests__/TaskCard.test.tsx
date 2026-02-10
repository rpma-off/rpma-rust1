import React from 'react';
import { render, screen } from '@testing-library/react';
import type { CalendarTask } from '@/lib/backend';
import { TaskCard } from '../TaskCard';

const createTask = (
  overrides: Partial<CalendarTask & { customer_name?: string | null }> = {}
): CalendarTask & { customer_name?: string | null } => ({
  id: 'task-1',
  task_number: 'TASK-001',
  title: 'Test Task',
  status: 'scheduled',
  priority: 'medium',
  scheduled_date: '2025-01-01',
  start_time: '08:00',
  end_time: '09:00',
  vehicle_plate: 'AA-123-BB',
  vehicle_model: null,
  technician_id: null,
  technician_name: null,
  client_id: null,
  client_name: 'John Doe',
  estimated_duration: null,
  actual_duration: null,
  ...overrides,
});

describe('TaskCard', () => {
  it('renders plate and client name in compact mode', () => {
    const task = createTask();

    render(<TaskCard task={task} mode="compact" />);

    expect(screen.getByText('AA-123-BB – John Doe')).toBeInTheDocument();
    expect(screen.queryByText(/TASK-001/)).not.toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('AA-123-BB – John Doe')
    );
  });

  it('falls back to customer name and N/A plate when missing data', () => {
    const task = createTask({
      vehicle_plate: null,
      client_name: null,
      customer_name: 'Jane Smith',
    });

    render(<TaskCard task={task} mode="full" />);

    expect(screen.getByText('N/A – Jane Smith')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('N/A – Jane Smith')
    );
  });
});
