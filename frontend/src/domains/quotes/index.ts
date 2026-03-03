export * from './api';

export * from './schema/quoteSchema';

export { compressImage, formatFileSize } from './utils/image-compression';
export type { CompressionOptions } from './utils/image-compression';

export {
  computeDiscountAmount,
  computeQuoteTotals,
  computeTotalsFromSubtotals,
} from './utils/quote-calculations';
export type { QuoteItemForCalc, QuoteTotals } from './utils/quote-calculations';
