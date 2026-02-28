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
  it('passes route task id to the workflow provider', () => {
    render(
      <PPFWorkflowLayout params={{ id: 'task-42' }}>
        <div>workflow content</div>
      </PPFWorkflowLayout>
    );

    expect(providerSpy).toHaveBeenCalledWith('task-42');
    expect(screen.getByTestId('workflow-provider')).toBeInTheDocument();
    expect(screen.getByText('workflow content')).toBeInTheDocument();
  });
});
