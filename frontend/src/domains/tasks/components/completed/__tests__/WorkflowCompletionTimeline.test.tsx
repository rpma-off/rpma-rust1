import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { WorkflowCompletionTimeline } from '../WorkflowCompletionTimeline';

describe('WorkflowCompletionTimeline', () => {
  it('renders preparation data summary and exposes edit/download actions', () => {
    const onToggleStep = jest.fn();
    const onEditStep = jest.fn();
    const onDownloadStep = jest.fn();

    render(
      <WorkflowCompletionTimeline
        steps={[
          {
            id: 'preparation',
            title: 'Preparation',
            status: 'completed',
            completed_at: '2026-03-01T10:00:00.000Z',
            collected_data: {
              surfaceChecklist: { wash: true, degrease: true },
              cutChecklist: { hood: true },
              materialsChecklist: { ppf_150: false, ppf_200: true },
              notes: 'Ready for installation',
            },
          },
        ]}
        expandedSteps={new Set(['preparation'])}
        onToggleStep={onToggleStep}
        onEditStep={onEditStep}
        onDownloadStep={onDownloadStep}
      />
    );

    expect(screen.getByText(/Surface checklist/i)).toBeInTheDocument();
    expect(screen.getByText(/Cut checklist/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Mat.riaux/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Modifier l'etape|Modifier l'étape/i }));
    expect(onEditStep).toHaveBeenCalledWith('preparation');

    fireEvent.click(screen.getByRole('button', { name: /Telecharger donnees|Télécharger données/i }));
    expect(onDownloadStep).toHaveBeenCalledWith('preparation');
  });

  it('shows raw fallback for unknown step data structure', () => {
    render(
      <WorkflowCompletionTimeline
        steps={[
          {
            id: 'custom_step',
            title: 'Custom',
            status: 'completed',
            collected_data: { nested: { value: 123 } },
          },
        ]}
        expandedSteps={new Set(['custom_step'])}
        onToggleStep={jest.fn()}
      />
    );

    expect(screen.getByText(/Structure non reconnue/i)).toBeInTheDocument();
  });
});
