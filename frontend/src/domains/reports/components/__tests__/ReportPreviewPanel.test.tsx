import React from 'react';
import { render, screen } from '@testing-library/react';
import { ReportPreviewPanel } from '../ReportPreviewPanel';
import type { InterventionReportViewModel } from '../../services/report-view-model.types';

const makeViewModel = (): InterventionReportViewModel => ({
  meta: {
    reportTitle: "Rapport d'intervention",
    generatedAt: '10/01/2024 15:00',
    interventionId: 'inter-1',
    taskNumber: 'TSK-001',
    reportNumber: 'INT-2024-0001',
  },
  summary: {
    status: 'Terminée',
    statusBadge: 'completed',
    technicianName: 'Marie Martin',
    estimatedDuration: '5h 0min',
    actualDuration: '5h 30min',
    completionPercentage: 100,
    interventionType: 'PPF (Film de protection)',
  },
  client: { name: 'Jean Dupont', email: 'jean@example.com', phone: '+33600000000' },
  vehicle: { plate: 'AB-123-CD', make: 'Renault', model: 'Clio', year: '2022', color: 'Bleu', vin: 'Non renseigné' },
  workConditions: { weather: 'Ensoleillé', lighting: 'Artificielle', location: 'Garage', temperature: '22.5 °C', humidity: '45 %' },
  materials: { filmType: 'Premium', filmBrand: 'XPEL', filmModel: 'Ultimate Plus' },
  steps: [],
  quality: { globalScore: '92/100', checkpoints: [], finalObservations: ['Travail de qualité'] },
  customerValidation: { satisfaction: '9/10', signaturePresent: true, comments: 'Très bon travail' },
  photos: { totalCount: 8, byStep: [] },
});

describe('ReportPreviewPanel', () => {
  it('shows loading skeleton when isLoading is true', () => {
    render(<ReportPreviewPanel viewModel={null} isLoading={true} />);
    expect(screen.getByTestId('report-preview-loading')).toBeInTheDocument();
  });

  it('shows empty state when viewModel is null', () => {
    render(<ReportPreviewPanel viewModel={null} isLoading={false} />);
    expect(screen.getByTestId('report-preview-empty')).toBeInTheDocument();
  });

  it('renders main panel when viewModel is provided', () => {
    render(<ReportPreviewPanel viewModel={makeViewModel()} isLoading={false} />);
    expect(screen.getByTestId('report-preview-panel')).toBeInTheDocument();
  });

  it('displays report title', () => {
    render(<ReportPreviewPanel viewModel={makeViewModel()} isLoading={false} />);
    expect(screen.getByText("Rapport d'intervention")).toBeInTheDocument();
  });

  it('displays client name', () => {
    render(<ReportPreviewPanel viewModel={makeViewModel()} isLoading={false} />);
    expect(screen.getByText('Jean Dupont')).toBeInTheDocument();
  });

  it('displays vehicle plate', () => {
    render(<ReportPreviewPanel viewModel={makeViewModel()} isLoading={false} />);
    expect(screen.getByText('AB-123-CD')).toBeInTheDocument();
  });

  it('displays technician name', () => {
    render(<ReportPreviewPanel viewModel={makeViewModel()} isLoading={false} />);
    expect(screen.getByText('Marie Martin')).toBeInTheDocument();
  });

  it('displays customer satisfaction score', () => {
    render(<ReportPreviewPanel viewModel={makeViewModel()} isLoading={false} />);
    expect(screen.getByText('9/10')).toBeInTheDocument();
  });

  it('displays global quality score', () => {
    render(<ReportPreviewPanel viewModel={makeViewModel()} isLoading={false} />);
    expect(screen.getByText('92/100')).toBeInTheDocument();
  });
});
