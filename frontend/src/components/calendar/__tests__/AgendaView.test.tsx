import React from 'react';
import { render, screen } from '@testing-library/react';
import type { CalendarTask } from '@/lib/backend';
import { AgendaView } from '../AgendaView';

const createTask = (overrides: Partial<CalendarTask> = {}): CalendarTask => ({
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

describe('AgendaView', () => {
  it('renders the calendar task label instead of the task number', () => {
    const task = createTask();

    render(<AgendaView tasks={[task]} currentDate={new Date('2025-01-01')} />);

    expect(screen.getByText('AA-123-BB – John Doe')).toBeInTheDocument();
    expect(screen.queryByText(/TASK-001/)).not.toBeInTheDocument();
  });
});
