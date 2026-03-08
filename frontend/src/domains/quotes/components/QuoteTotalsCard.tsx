'use client';

import { formatCents } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { computeTotalsFromSubtotals } from '@/domains/quotes/utils/quote-calculations';
import { Calculator, Percent, Tag, Receipt } from 'lucide-react';

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
  currencyCode: _currencyCode = 'EUR',
  onTaxRateChange,
  onDiscountTypeChange,
  onDiscountValueChange,
}: QuoteTotalsCardProps) {
  const rawSubtotal = partsSubtotal + laborSubtotal;

  const { subtotal, taxTotal, total, discountAmount } = computeTotalsFromSubtotals(
    rawSubtotal,
    taxRate,
    discountType,
    discountValue
  );

  return (
    <div className="space-y-4 pt-4 border-t border-border">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Calculator className="h-4 w-4 text-muted-foreground" />
        Récapitulatif
      </h3>

      <div className="space-y-3">
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
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
            <Label className="text-xs text-muted-foreground">Remise</Label>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={discountType}
              onValueChange={(v) => onDiscountTypeChange(v as DiscountType)}
            >
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune</SelectItem>
                <SelectItem value="percentage">Pourcentage</SelectItem>
                <SelectItem value="fixed">Montant fixe</SelectItem>
              </SelectContent>
            </Select>
            {discountType !== 'none' && (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountValue}
                  onChange={(e) => onDiscountValueChange(parseFloat(e.target.value) || 0)}
                  className="h-8 w-20 text-right text-xs"
                />
                {discountType === 'percentage' && (
                  <span className="text-muted-foreground text-sm">%</span>
                )}
              </div>
            )}
          </div>
          {discountAmount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-destructive text-xs">Remise appliquée</span>
              <span className="text-destructive">-{formatCents(discountAmount)}</span>
            </div>
          )}
        </div>

        {/* Tax */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Percent className="h-3.5 w-3.5 text-muted-foreground" />
            <Label className="text-xs text-muted-foreground">TVA</Label>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              step="0.1"
              value={taxRate}
              onChange={(e) => onTaxRateChange(parseFloat(e.target.value) || 0)}
              className="h-8 w-24 text-xs"
            />
            <span className="text-muted-foreground text-sm">%</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground text-xs">Montant TVA</span>
            <span>{formatCents(taxTotal)}</span>
          </div>
        </div>

        {/* Total */}
        <div className="flex items-center justify-between border-t border-border pt-3">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-green-500" />
            <span className="text-lg font-bold">Total TTC</span>
          </div>
          <span className="text-lg font-bold text-green-600">{formatCents(total)}</span>
        </div>
      </div>
    </div>
  );
}
