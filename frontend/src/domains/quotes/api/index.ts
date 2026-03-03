/**
 * quotes Domain - Public API
 */

export { QuotesProvider, useQuotesDomainContext } from './QuotesProvider';
export {
  useQuotesList,
  useQuote,
  useCreateQuote,
  useUpdateQuote,
  useDeleteQuote,
  useQuoteItems,
  useQuoteStatus,
  useQuoteExportPdf,
  useQuoteAttachments,
  useQuoteAttachmentActions,
  useConvertQuoteToTask,
  useQuotePublicLink,
} from '../hooks/useQuotes';

export type { QuotesDomainContextValue } from './types';

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
  QuoteCustomerResponse,
  QuotePublicLinkCard,
  QuoteShareDialog,
  QuoteDetailPageContent,
  QuotesListTable,
  QuotesStatusTabs,
  STATUS_LABELS,
} from '../components';
export type {
  QuoteStatusBadgeProps,
  QuoteItemsTableProps,
  QuoteTotalsProps,
  QuoteAttachmentsManagerProps,
  QuotePartInput,
  QuoteLaborInput,
} from '../components';

export { computeQuoteStats } from '../utils/quote-stats';
export type { QuotePageStats } from '../utils/quote-stats';

export { formatCents } from '../utils/formatting';
export { useQuoteDetailPage } from '../hooks/useQuoteDetailPage';
export type { ActiveTab } from '../hooks/useQuoteDetailPage';
