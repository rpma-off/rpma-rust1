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
} from '../hooks/useQuotes';

export type { QuotesDomainContextValue } from './types';

export {
  QuoteStatusBadge,
  QuoteItemsTable,
  QuoteTotals,
  QuoteAttachmentsManager,
  STATUS_LABELS,
} from '../components';
export type {
  QuoteStatusBadgeProps,
  QuoteItemsTableProps,
  QuoteTotalsProps,
  QuoteAttachmentsManagerProps,
} from '../components';

export { computeQuoteStats } from '../utils/quote-stats';
export type { QuotePageStats } from '../utils/quote-stats';
