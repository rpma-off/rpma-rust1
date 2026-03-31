import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReportPreviewStepCard } from '../preview/ReportPreviewStepCard';
import type { ReportStepViewModel } from '../../services/report-view-model.types';

const makeStep = (overrides: Partial<ReportStepViewModel> = {}): ReportStepViewModel => ({
  id: 'step-1',
  title: 'Inspection',
  number: 1,
  status: 'Terminée',
  statusBadge: 'completed',
  startedAt: '10/01/2024 08:30',
  completedAt: '10/01/2024 09:00',
  duration: '30 min',
  photoCount: 3,
  notes: 'Aucune observation',
  defects: [],
  observations: [],
  zones: [],
  qualityScore: '90/100',
  qualityScores: [90],
  checklist: [],
  measurements: [],
  environment: [],
  approvedBy: 'Non renseigné',
  approvedAt: 'Non renseigné',
  rejectionReason: '',
  ...overrides,
});

describe('ReportPreviewStepCard', () => {
  it('renders step title and number', () => {
    render(<ReportPreviewStepCard step={makeStep()} />);
    expect(screen.getByText('Inspection')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows status badge', () => {
    render(<ReportPreviewStepCard step={makeStep()} />);
    expect(screen.getByText('Terminée')).toBeInTheDocument();
  });

  it('shows defects after expanding the card', async () => {
    const step = makeStep({ defects: ['Rayure légère'], notes: 'RAS' });

    render(<ReportPreviewStepCard step={step} />);

    // Card auto-opens when defects are present
    expect(screen.getByText('Rayure légère')).toBeInTheDocument();
  });

  it('renders checklist items when expanded', async () => {
    const user = userEvent.setup();
    const step = makeStep({
      checklist: [{ label: 'Surface propre', checked: true }],
    });

    render(<ReportPreviewStepCard step={step} />);

    const header = screen.getByRole('button');
    await user.click(header);

    expect(screen.getByText('Surface propre')).toBeInTheDocument();
    expect(screen.getByText('Liste de contrôle')).toBeInTheDocument();
  });

  it('renders localized zone labels without snake_case fallback formatting', async () => {
    const user = userEvent.setup();
    const step = makeStep({ zones: ['Pare-chocs avant'] });

    render(<ReportPreviewStepCard step={step} />);

    const header = screen.getByRole('button');
    await user.click(header);

    expect(screen.getByText('Pare-chocs avant')).toBeInTheDocument();
  });

  it('shows rejection reason when present and card is open', () => {
    const step = makeStep({ rejectionReason: 'Film mal aligné', defects: ['Bulle'] });
    render(<ReportPreviewStepCard step={step} />);
    expect(screen.getByText('Film mal aligné')).toBeInTheDocument();
  });

  it('shows Aucune observation placeholder for notes when card is toggled open', async () => {
    const user = userEvent.setup();
    const step = makeStep({ notes: 'Aucune observation', defects: [] });

    render(<ReportPreviewStepCard step={step} />);

    const header = screen.getByRole('button');
    await user.click(header);

    expect(screen.getByText('Aucune observation')).toBeInTheDocument();
  });
});
