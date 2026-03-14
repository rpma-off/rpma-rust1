import { render, screen } from '@testing-library/react';
import { PageSkeleton } from '@/app/PageSkeleton';
import AdminLoading from '@/app/admin/loading';
import ClientsLoading from '@/app/clients/loading';
import ClientDetailLoading from '@/app/clients/[id]/loading';
import ConfigurationLoading from '@/app/configuration/loading';
import InterventionsLoading from '@/app/interventions/loading';
import InventoryLoading from '@/app/inventory/loading';
import QuotesLoading from '@/app/quotes/loading';
import QuoteDetailLoading from '@/app/quotes/[id]/loading';
import ScheduleLoading from '@/app/schedule/loading';
import SettingsLoading from '@/app/settings/loading';
import StaffLoading from '@/app/staff/loading';
import TasksLoading from '@/app/tasks/loading';
import TaskDetailLoading from '@/app/tasks/[id]/loading';
import UsersLoading from '@/app/users/loading';

describe('route loading fallbacks', () => {
  it('renders page skeleton layout', () => {
    render(<PageSkeleton />);
    expect(screen.getByTestId('page-skeleton')).toBeInTheDocument();
  });

  it('uses the skeleton fallback for admin loading route', () => {
    render(<AdminLoading />);
    expect(screen.getByTestId('page-skeleton')).toBeInTheDocument();
  });

  it('uses the skeleton fallback for clients loading route', () => {
    render(<ClientsLoading />);
    expect(screen.getByTestId('page-skeleton')).toBeInTheDocument();
  });

  it('uses the skeleton fallback for client detail loading route', () => {
    render(<ClientDetailLoading />);
    expect(screen.getByTestId('page-skeleton')).toBeInTheDocument();
  });

  it('uses the skeleton fallback for configuration loading route', () => {
    render(<ConfigurationLoading />);
    expect(screen.getByTestId('page-skeleton')).toBeInTheDocument();
  });

  it('uses the skeleton fallback for interventions loading route', () => {
    render(<InterventionsLoading />);
    expect(screen.getByTestId('page-skeleton')).toBeInTheDocument();
  });

  it('uses the skeleton fallback for inventory loading route', () => {
    render(<InventoryLoading />);
    expect(screen.getByTestId('page-skeleton')).toBeInTheDocument();
  });

  it('uses the skeleton fallback for quotes loading route', () => {
    render(<QuotesLoading />);
    expect(screen.getByTestId('quotes-loading')).toBeInTheDocument();
  });

  it('uses the skeleton fallback for quote detail loading route', () => {
    render(<QuoteDetailLoading />);
    expect(screen.getByTestId('page-skeleton')).toBeInTheDocument();
  });

  it('uses the skeleton fallback for schedule loading route', () => {
    render(<ScheduleLoading />);
    expect(screen.getByTestId('page-skeleton')).toBeInTheDocument();
  });

  it('uses the skeleton fallback for settings loading route', () => {
    render(<SettingsLoading />);
    expect(screen.getByTestId('page-skeleton')).toBeInTheDocument();
  });

  it('uses the skeleton fallback for staff loading route', () => {
    render(<StaffLoading />);
    expect(screen.getByTestId('page-skeleton')).toBeInTheDocument();
  });

  it('uses the skeleton fallback for tasks loading route', () => {
    render(<TasksLoading />);
    expect(screen.getByTestId('tasks-loading')).toBeInTheDocument();
  });

  it('uses the skeleton fallback for task detail loading route', () => {
    render(<TaskDetailLoading />);
    expect(screen.getByTestId('page-skeleton')).toBeInTheDocument();
  });

  it('uses the skeleton fallback for users loading route', () => {
    render(<UsersLoading />);
    expect(screen.getByTestId('page-skeleton')).toBeInTheDocument();
  });
});
