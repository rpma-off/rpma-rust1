export { QuotesProvider, useQuotesDomainContext } from './api/QuotesProvider';
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
} from './hooks/useQuotes';
export type { QuotesDomainContextValue } from './api/types';
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
} from './components';
export type {
  QuoteStatusBadgeProps,
  QuoteItemsTableProps,
  QuoteTotalsProps,
  QuoteAttachmentsManagerProps,
  QuotePartInput,
  QuoteLaborInput,
  QuoteWorkflowPanelProps,
} from './components';
export { computeQuoteStats } from './utils/quote-stats';
export type { QuotePageStats } from '@/types/quote.types';
export { formatCents } from '@/lib/format';
export { useQuoteDetailPage } from './hooks/useQuoteDetailPage';
export type { ActiveTab } from './hooks/useQuoteDetailPage';
export { useQuotesPage } from './hooks/useQuotesPage';
export type { ActiveTab as QuotesPageActiveTab, QuoteWithClient } from './hooks/useQuotesPage';
export { useNewQuotePage } from './hooks/useNewQuotePage';

export {
  QuoteStatusEnum,
  QuoteItemKindEnum,
  CreateQuoteItemSchema,
  CreateQuoteSchema,
  UpdateQuoteSchema,
  QuoteFiltersSchema,
} from './schema/quoteSchema';
export type {
  CreateQuoteFormData,
  UpdateQuoteFormData,
  CreateQuoteItemFormData,
  QuoteFiltersFormData,
} from './schema/quoteSchema';

export { compressImage } from './utils/image-compression';
export { formatFileSize } from '@/lib/format';
export type { CompressionOptions } from './utils/image-compression';

export {
  computeDiscountAmount,
  computeQuoteTotals,
  computeTotalsFromSubtotals,
} from './utils/quote-calculations';
export type { QuoteItemForCalc } from './utils/quote-calculations';
