/**
 * quotes Domain - Public API
 */

export { QuotesProvider, useQuotesDomainContext } from './QuotesProvider';
/** TODO: document */
export {
  useQuotesList,
  useQuote,
  useCreateQuote,
  useUpdateQuote,
  useDeleteQuote,
  useDuplicateQuote,
  useQuoteItems,
  useQuoteStatus,
  useQuoteExportPdf,
  useQuoteAttachments,
  useQuoteAttachmentActions,
  useConvertQuoteToTask,
} from '../hooks/useQuotes';

/** TODO: document */
export type { QuotesDomainContextValue } from './types';

/** TODO: document */
export {
  QuoteStatusBadge,
  QuoteItemsTable,
  QuoteTotals,
  QuoteAttachmentsManager,
  QuoteConvertDialog,
  QuoteImagesManager,
  QuoteDocumentsManager,
  QuotePartsSection,
  QuoteLaborSection,
  QuoteNotesEditor,
  QuoteVehicleCustomerCard,
  QuoteDetailsCard,
  QuoteTotalsCard,
  QuoteDetailPageContent,
  QuotesListTable,
  QuotesStatusTabs,
  QuoteWorkflowPanel,
  QuoteCharts,
  STATUS_LABELS,
} from '../components';
/** TODO: document */
export type {
  QuoteStatusBadgeProps,
  QuoteItemsTableProps,
  QuoteTotalsProps,
  QuoteAttachmentsManagerProps,
  QuotePartInput,
  QuoteLaborInput,
  QuoteWorkflowPanelProps,
} from '../components';

/** TODO: document */
export { computeQuoteStats } from '../utils/quote-stats';
/** TODO: document */
export type { QuotePageStats } from '../utils/quote-stats';

/** TODO: document */
export { formatCents } from '../utils/formatting';
/** TODO: document */
export { useQuoteDetailPage } from '../hooks/useQuoteDetailPage';
/** TODO: document */
export type { ActiveTab } from '../hooks/useQuoteDetailPage';
/** TODO: document */
export { useQuotesPage } from '../hooks/useQuotesPage';
/** TODO: document */
export type { ActiveTab as QuotesPageActiveTab, QuoteWithClient } from '../hooks/useQuotesPage';
/** TODO: document */
export { useNewQuotePage } from '../hooks/useNewQuotePage';
