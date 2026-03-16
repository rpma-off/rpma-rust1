import { render, screen } from '@testing-library/react';
import { GlobalHealthBanner } from '../GlobalHealthBanner';

const mockUseHealthCheck = jest.fn();

jest.mock('../useHealthCheck', () => ({
  useHealthCheck: (...args: unknown[]) => mockUseHealthCheck(...args),
}));

describe('GlobalHealthBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a destructive banner when the health check fails', () => {
    mockUseHealthCheck.mockReturnValue({ hasFailed: true });

    render(<GlobalHealthBanner />);

    expect(screen.getByTestId('global-health-banner')).toBeInTheDocument();
    expect(screen.getByText('Base de données indisponible')).toBeInTheDocument();
  });

  it('does not render when the health check is healthy', () => {
    mockUseHealthCheck.mockReturnValue({ hasFailed: false });

    render(<GlobalHealthBanner />);

    expect(screen.queryByTestId('global-health-banner')).not.toBeInTheDocument();
  });

  it('does not render when disabled', () => {
    mockUseHealthCheck.mockReturnValue({ hasFailed: true });

    render(<GlobalHealthBanner enabled={false} />);

    expect(screen.queryByTestId('global-health-banner')).not.toBeInTheDocument();
  });
});
