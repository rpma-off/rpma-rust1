import { render, screen } from '@testing-library/react';
import PPFWorkflowLayout from './layout';

const providerSpy = jest.fn();

jest.mock('@/domains/interventions', () => ({
  PPFWorkflowProvider: ({ taskId, children }: { taskId: string; children: React.ReactNode }) => {
    providerSpy(taskId);
    return <div data-testid="workflow-provider">{children}</div>;
  },
}));

describe('PPF workflow layout', () => {
  beforeEach(() => {
    providerSpy.mockClear();
  });

  it('passes route task id to the workflow provider', async () => {
    const layout = await PPFWorkflowLayout({
      params: { id: 'task-42' },
      children: <div>workflow content</div>,
    });

    render(layout);

    expect(providerSpy).toHaveBeenCalledWith('task-42');
    expect(screen.getByTestId('workflow-provider')).toBeInTheDocument();
    expect(screen.getByText('workflow content')).toBeInTheDocument();
  });

  it('supports promise params in server layout', async () => {
    const layout = await PPFWorkflowLayout({
      params: Promise.resolve({ id: 'task-99' }),
      children: <div>workflow content async</div>,
    });

    render(layout);

    expect(providerSpy).toHaveBeenCalledWith('task-99');
    expect(screen.getByText('workflow content async')).toBeInTheDocument();
  });
});
