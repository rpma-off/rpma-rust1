import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecordDetailPanel } from '../../../app/reports/components/data-explorer/RecordDetailPanel';

describe('RecordDetailPanel', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it('shows empty state when no record is selected', () => {
    render(<RecordDetailPanel record={null} onClose={mockOnClose} />);

    expect(screen.getByText('Aucun élément sélectionné')).toBeInTheDocument();
    expect(screen.getByText('Cliquez sur un résultat pour voir les détails')).toBeInTheDocument();
  });

  it('displays task details correctly', () => {
    const taskRecord = {
      id: '1',
      entity_type: 'task' as const,
      title: 'Protection PPF - Renault Clio',
      subtitle: 'Client: Jean Dupont • Technicien: Marie Martin',
      status: 'completed',
      date: '2024-12-15',
      metadata: {
        vehiclePlate: 'AB-123-CD',
        vehicleMake: 'Renault',
        vehicleModel: 'Clio',
        ppfZones: 'capot,pare-chocs',
        qualityScore: '95',
        technicianId: 'tech-1',
        technicianName: 'Marie Martin',
      },
    };

    render(<RecordDetailPanel record={taskRecord} onClose={mockOnClose} />);

    expect(screen.getByText('Protection PPF - Renault Clio')).toBeInTheDocument();
    expect(screen.getByText('Client: Jean Dupont • Technicien: Marie Martin')).toBeInTheDocument();
    expect(screen.getByText('Terminé')).toBeInTheDocument();
    expect(screen.getByText('AB-123-CD')).toBeInTheDocument();
    expect(screen.getByText('95/100')).toBeInTheDocument();
    expect(screen.getByText('Marie Martin')).toBeInTheDocument();
  });

  it('displays client details correctly', () => {
    const clientRecord = {
      id: '2',
      entity_type: 'client' as const,
      title: 'Sophie Bernard',
      subtitle: 'sophie.bernard@email.com • 3 véhicules',
      status: 'active',
      date: '2024-12-08',
      metadata: {
        email: 'jean.dupont@email.com',
        phone: '+33123456789',
        customerType: 'individual',
        totalTasks: '5',
        completedTasks: '4',
        averageRating: '4.5',
        lastTaskDate: '2024-12-10',
      },
    };

    render(<RecordDetailPanel record={clientRecord} onClose={mockOnClose} />);

    expect(screen.getByText('Sophie Bernard')).toBeInTheDocument();
    expect(screen.getByText('sophie.bernard@email.com • 3 véhicules')).toBeInTheDocument();
    expect(screen.getByText('Actif')).toBeInTheDocument();
    expect(screen.getByText('jean.dupont@email.com')).toBeInTheDocument();
    expect(screen.getByText('individual')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('displays intervention details correctly', () => {
    const interventionRecord = {
      id: '3',
      entity_type: 'intervention' as const,
      title: 'Étape 1: Préparation surface - Renault Clio',
      subtitle: 'Tâche: Protection PPF • Technicien: Marie Martin',
      status: 'completed',
      date: '2024-12-15',
      metadata: {
        taskId: 'task-1',
        interventionId: 'int-1',
        stepNumber: '1',
        stepName: 'Preparation',
        stepType: 'preparation',
        duration: '30',
        qualityScore: '90',
        photosCount: '2',
        vehiclePlate: 'AB-123-CD',
        vehicleMake: 'Renault',
        vehicleModel: 'Clio',
        technicianName: 'Marie Martin',
      },
    };

    render(<RecordDetailPanel record={interventionRecord} onClose={mockOnClose} />);

    expect(screen.getByText('Étape 1: Préparation surface - Renault Clio')).toBeInTheDocument();
    expect(screen.getByText('Tâche: Protection PPF • Technicien: Marie Martin')).toBeInTheDocument();
    expect(screen.getByText('Terminé')).toBeInTheDocument();
    expect(screen.getByText('Marie Martin')).toBeInTheDocument();
    expect(screen.getAllByText(/Non/).length).toBeGreaterThan(0);
  });

  it('calls onClose when close button is clicked', () => {
    const taskRecord = {
      id: '1',
      entity_type: 'task' as const,
      title: 'Test Task',
      subtitle: 'Test subtitle',
      status: 'completed',
      date: '2024-12-15',
      metadata: {},
    };

    render(<RecordDetailPanel record={taskRecord} onClose={mockOnClose} />);

    const closeButton = screen.getAllByRole('button')[0];
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('displays formatted date', () => {
    const taskRecord = {
      id: '1',
      entity_type: 'task' as const,
      title: 'Test Task',
      subtitle: 'Test subtitle',
      status: 'completed',
      date: '2024-12-15',
      metadata: {},
    };

    render(<RecordDetailPanel record={taskRecord} onClose={mockOnClose} />);

    // Should display formatted date
    expect(screen.getByText(/15/)).toBeInTheDocument();
    expect(screen.getByText(/décembre/)).toBeInTheDocument();
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });

  it('shows action buttons', () => {
    const taskRecord = {
      id: '1',
      entity_type: 'task' as const,
      title: 'Test Task',
      subtitle: 'Test subtitle',
      status: 'completed',
      date: '2024-12-15',
      metadata: {},
    };

    render(<RecordDetailPanel record={taskRecord} onClose={mockOnClose} />);

    expect(screen.getByText('Voir complet')).toBeInTheDocument();
    expect(screen.getByText('Exporter')).toBeInTheDocument();
  });

  it('handles records without optional fields', () => {
    const minimalRecord = {
      id: '1',
      entity_type: 'task' as const,
      title: 'Minimal Task',
      subtitle: 'Minimal subtitle',
      status: null,
      date: null,
      metadata: {},
    };

    render(<RecordDetailPanel record={minimalRecord} onClose={mockOnClose} />);

    expect(screen.getByText('Minimal Task')).toBeInTheDocument();
    expect(screen.getByText('Minimal subtitle')).toBeInTheDocument();
    expect(screen.getByText('Non spécifiée')).toBeInTheDocument(); // For missing date
  });

  it('displays correct entity icon', () => {
    const taskRecord = {
      id: '1',
      entity_type: 'task' as const,
      title: 'Test Task',
      subtitle: 'Test subtitle',
      status: 'completed',
      date: '2024-12-15',
      metadata: {},
    };

    render(<RecordDetailPanel record={taskRecord} onClose={mockOnClose} />);

    // The icon should be present in the header
    const header = screen.getByText('Détails').closest('div');
    expect(header).toBeInTheDocument();
  });
});