'use client';

import { formatCents, getCurrencySymbol } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { computeTotalsFromSubtotals } from '@/domains/quotes/utils/quote-calculations';

type DiscountType = 'none' | 'percentage' | 'fixed';

interface QuoteTotalsCardProps {
  partsSubtotal: number;
  laborSubtotal: number;
  taxRate: number;
  discountType: DiscountType;
  discountValue: number;
  currencyCode?: string;
  onTaxRateChange: (rate: number) => void;
  onDiscountTypeChange: (type: DiscountType) => void;
  onDiscountValueChange: (value: number) => void;
}

export function QuoteTotalsCard({
  partsSubtotal,
  laborSubtotal,
  taxRate,
  discountType,
  discountValue,
  currencyCode = 'EUR',
  onTaxRateChange,
  onDiscountTypeChange,
  onDiscountValueChange,
}: QuoteTotalsCardProps) {
  const cs = getCurrencySymbol(currencyCode);

  const rawSubtotal = partsSubtotal + laborSubtotal;

  const { subtotal, taxTotal, total, discountAmount } = computeTotalsFromSubtotals(
    rawSubtotal,
    taxRate,
    discountType,
    discountValue
  );

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <h3 className="text-sm font-semibold">Récapitulatif</h3>

      <div className="space-y-2">
        {/* Parts Subtotal */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Pièces</span>
          <span>{formatCents(partsSubtotal)}</span>
        </div>

        {/* Labor Subtotal */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Main d&apos;œuvre</span>
          <span>{formatCents(laborSubtotal)}</span>
        </div>

        {/* Subtotal */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Sous-total</span>
          <span className="font-medium">{formatCents(subtotal)}</span>
        </div>

        {/* Discount */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Remise</span>
            <Select
              value={discountType}
              onValueChange={(v) => onDiscountTypeChange(v as DiscountType)}
            >
              <SelectTrigger className="h-7 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune</SelectItem>
                <SelectItem value="percentage">Pourcentage</SelectItem>
                <SelectItem value="fixed">Fixe</SelectItem>
              </SelectContent>
            </Select>
            {discountType !== 'none' && (
              <Input
                type="number"
                min="0"
                step="0.01"
                value={discountValue}
                onChange={(e) => onDiscountValueChange(parseFloat(e.target.value) || 0)}
                className="h-7 w-20 text-right text-xs"
              />
            )}
            {discountType === 'percentage' && (
              <span className="text-muted-foreground">%</span>
            )}
          </div>
          {discountAmount > 0 && (
            <span className="text-destructive">-{formatCents(discountAmount)}</span>
          )}
        </div>

        {/* Tax */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">TVA</span>
            <Input
              type="number"
              min="0"
              step="0.1"
              value={taxRate}
              onChange={(e) => onTaxRateChange(parseFloat(e.target.value) || 0)}
              className="h-7 w-20 text-right text-xs"
            />
            <span className="text-muted-foreground">%</span>
          </div>
          <span>{formatCents(taxTotal)}</span>
        </div>

        {/* Total */}
        <div className="flex items-center justify-between border-t pt-2 text-lg font-bold">
          <span>Total TTC</span>
          <span>{formatCents(total)}</span>
        </div>
      </div>
    </div>
  );
}
