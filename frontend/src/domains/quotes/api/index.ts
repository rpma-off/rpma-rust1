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
} from '../hooks/useQuotes';

export type { QuotesDomainContextValue } from './types';

export {
  QuoteStatusBadge,
  QuoteItemsTable,
  QuoteTotals,
  STATUS_LABELS,
} from '../components';
export type {
  QuoteStatusBadgeProps,
  QuoteItemsTableProps,
  QuoteTotalsProps,
} from '../components';
