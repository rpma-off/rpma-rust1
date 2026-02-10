import React from 'react';
import { render, screen } from '@testing-library/react';
import { TaskCard, type CalendarTaskWithCustomerName } from '../TaskCard';

const createTask = (
  overrides: Partial<CalendarTaskWithCustomerName> = {}
): CalendarTaskWithCustomerName => ({
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

  it('falls back to N/A when plate and client name are missing', () => {
    const task = createTask({
      vehicle_plate: null,
      client_name: null,
      customer_name: null,
    });

    render(<TaskCard task={task} mode="compact" />);

    expect(screen.getByText('N/A – N/A')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('N/A – N/A')
    );
  });
});
