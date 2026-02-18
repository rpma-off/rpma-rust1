import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EditTaskModal from '../EditTaskModal';
import type { TaskWithDetails } from '@/lib/backend';

const mockMutate = jest.fn();

let mockIsPending = false;

jest.mock('@/domains/auth', () => ({
  useAuth: () => ({ user: { token: 'token' } }),
}));

jest.mock('@/lib/ipc', () => ({
  ipcClient: {
    tasks: {
      editTask: jest.fn(),
    },
  },
}));

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    invalidateQueries: jest.fn(),
  }),
  useMutation: () => ({
    mutate: mockMutate,
    isPending: mockIsPending,
  }),
}));

jest.mock('@/lib/enhanced-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

const baseTask = {
  id: 'task-1',
  title: 'Test task',
  description: 'desc',
  priority: 'medium',
  scheduled_date: '',
  date_rdv: '',
  heure_rdv: '',
  estimated_duration: null,
  notes: '',
} as TaskWithDetails;

const mockEnhancedToast = jest.requireMock('@/lib/enhanced-toast').default as {
  success: jest.Mock;
  error: jest.Mock;
  info: jest.Mock;
};

describe('EditTaskModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPending = false;
  });

  it('shows standardized loading label while submitting', () => {
    mockIsPending = true;

    render(
      <EditTaskModal
        task={baseTask}
        open={true}
        onOpenChange={jest.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /mise à jour/i })).toBeDisabled();
  });

  it('uses standardized info toast when no changes are detected', () => {
    render(
      <EditTaskModal
        task={baseTask}
        open={true}
        onOpenChange={jest.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /mettre à jour/i }));

    expect(mockEnhancedToast.info).toHaveBeenCalledWith('Aucune modification détectée');
    expect(mockMutate).not.toHaveBeenCalled();
  });
});
