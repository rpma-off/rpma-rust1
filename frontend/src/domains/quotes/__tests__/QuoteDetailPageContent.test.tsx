import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { QuoteDetailPageContent } from '../components/QuoteDetailPageContent';
import { useQuoteDetailPage } from '../hooks/useQuoteDetailPage';
import type { Quote } from '@/types/quote.types';

jest.mock('../hooks/useQuoteDetailPage');
jest.mock('../components/QuoteWorkflowPanel', () => ({
  QuoteWorkflowPanel: () => <div data-testid="workflow-panel" />,
}));
jest.mock('../components/QuoteConvertDialog', () => ({
  QuoteConvertDialog: () => null,
}));
jest.mock('../components/QuoteStatusBadge', () => ({
  QuoteStatusBadge: () => <div data-testid="status-badge" />,
}));
jest.mock('@/shared/ui/animations/FadeIn', () => ({
  FadeIn: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'quote-1' }),
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('lucide-react', () => {
  const Icon = ({ className }: { className?: string }) => <span className={className} />;
  return {
    Send: Icon,
    CheckCircle: Icon,
    XCircle: Icon,
    FileDown: Icon,
    FileText: Icon,
    Plus: Icon,
    Trash2: Icon,
    Copy: Icon,
    MoreVertical: Icon,
    Clock: Icon,
    FileUp: Icon,
    Quote: Icon,
    Image: Icon,
    History: Icon,
    ArrowRight: Icon,
  };
});

const baseQuote: Quote = {
  id: 'quote-1',
  quote_number: 'DEV-0001',
  client_id: 'client-1',
  task_id: null,
  status: 'accepted',
  valid_until: null,
  description: null,
  notes: null,
  terms: null,
  subtotal: 10000,
  tax_total: 2000,
  total: 12000,
  discount_type: null,
  discount_value: null,
  discount_amount: null,
  vehicle_plate: 'AB-123-CD',
  vehicle_make: 'Tesla',
  vehicle_model: 'Model 3',
  vehicle_year: '2024',
  vehicle_vin: 'VIN123',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by: null,
  items: [],
};

const mockUseQuoteDetailPage = useQuoteDetailPage as jest.MockedFunction<typeof useQuoteDetailPage>;

const makeHookReturn = (overrides: Partial<ReturnType<typeof useQuoteDetailPage>> = {}) => ({
  quote: baseQuote,
  loading: false,
  error: null,
  attachments: [],
  attachmentsLoading: false,
  statusLoading: false,
  exportLoading: false,
  duplicateLoading: false,
  activeTab: 'details',
  setActiveTab: jest.fn(),
  showConvertDialog: false,
  setShowConvertDialog: jest.fn(),
  showDeleteDialog: false,
  setShowDeleteDialog: jest.fn(),
  showAddItem: false,
  setShowAddItem: jest.fn(),
  acceptedTaskId: null,
  newLabel: '',
  setNewLabel: jest.fn(),
  newKind: 'service',
  setNewKind: jest.fn(),
  newQty: 1,
  setNewQty: jest.fn(),
  newUnitPrice: 0,
  setNewUnitPrice: jest.fn(),
  newDescription: '',
  setNewDescription: jest.fn(),
  isDraft: false,
  isSent: false,
  isAccepted: true,
  isConverted: false,
  isRejected: false,
  isExpired: false,
  isChangesRequested: false,
  canEdit: false,
  convertLoading: false,
  handleAddItem: jest.fn(),
  handleDeleteItem: jest.fn(),
  handleMarkSent: jest.fn(),
  handleMarkAccepted: jest.fn(),
  handleMarkRejected: jest.fn(),
  handleMarkExpired: jest.fn(),
  handleMarkChangesRequested: jest.fn(),
  handleReopen: jest.fn(),
  handleDelete: jest.fn(),
  handleExportPdf: jest.fn(),
  handleCopyLink: jest.fn(),
  handleDuplicate: jest.fn(),
  handleConvertToTask: jest.fn(),
  refetch: jest.fn(),
  ...overrides,
});

describe('QuoteDetailPageContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows Convert to Task button for accepted quotes', () => {
    const handleConvertToTask = jest.fn();
    mockUseQuoteDetailPage.mockReturnValue(
      makeHookReturn({ handleConvertToTask })
    );

    render(<QuoteDetailPageContent />);

    const button = screen.getByRole('button', { name: /Convert to Task/i });
    fireEvent.click(button);

    expect(handleConvertToTask).toHaveBeenCalled();
  });

  it('hides Convert to Task button when quote is not accepted', () => {
    mockUseQuoteDetailPage.mockReturnValue(
      makeHookReturn({
        isAccepted: false,
        quote: { ...baseQuote, status: 'sent' },
      })
    );

    render(<QuoteDetailPageContent />);

    expect(screen.queryByRole('button', { name: /Convert to Task/i })).not.toBeInTheDocument();
  });
});
