import { z } from 'zod';

export const QuoteStatusEnum = z.enum([
  'draft',
  'sent',
  'accepted',
  'rejected',
  'expired',
  'converted',
  'changes_requested',
]);

export const QuoteItemKindEnum = z.enum([
  'labor',
  'material',
  'service',
  'discount',
]);

export const CreateQuoteItemSchema = z.object({
  kind: QuoteItemKindEnum,
  label: z.string().min(1, 'Libellé requis'),
  qty: z.number().min(0.01, 'Quantité requise'),
  unit_price: z.number().min(0, 'Prix unitaire requis'),
  tax_rate: z.number().min(0).max(100).optional(),
  position: z.number().optional(),
});

export const CreateQuoteSchema = z.object({
  client_id: z.string().min(1, 'Client requis'),
  vehicle_plate: z.string().optional(),
  vehicle_make: z.string().optional(),
  vehicle_model: z.string().optional(),
  vehicle_year: z.string().optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  valid_until: z.string().optional(),
  items: z.array(CreateQuoteItemSchema).optional(),
});

export const UpdateQuoteSchema = z.object({
  vehicle_plate: z.string().optional(),
  vehicle_make: z.string().optional(),
  vehicle_model: z.string().optional(),
  vehicle_year: z.string().optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  valid_until: z.string().optional(),
  discount_type: z.enum(['percentage', 'fixed']).optional(),
  discount_value: z.number().min(0, 'La remise ne peut pas être négative').optional(),
}).refine(
  (data) => {
    if (data.discount_type === 'percentage' && data.discount_value != null) {
      return data.discount_value <= 100;
    }
    return true;
  },
  { message: 'La remise en pourcentage ne peut pas dépasser 100%', path: ['discount_value'] }
);

export const QuoteFiltersSchema = z.object({
  search: z.string().optional(),
  status: QuoteStatusEnum.optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
});

export type CreateQuoteFormData = z.infer<typeof CreateQuoteSchema>;
export type UpdateQuoteFormData = z.infer<typeof UpdateQuoteSchema>;
export type CreateQuoteItemFormData = z.infer<typeof CreateQuoteItemSchema>;
export type QuoteFiltersFormData = z.infer<typeof QuoteFiltersSchema>;
