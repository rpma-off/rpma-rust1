"use client";

import { FileText, Plus, Trash2 } from "lucide-react";
import { formatCents } from "@/lib/format";
import type { QuoteItemKind } from "@/shared/types";
import type { Quote } from "@/types/quote.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface QuoteItemsTabProps {
  quote: Quote;
  canEdit: boolean;
  showAddItem: boolean;
  newLabel: string;
  newKind: QuoteItemKind;
  newQty: number;
  newUnitPrice: number;
  newDescription: string;
  onOpenAddItem: () => void;
  onCancelAddItem: () => void;
  onNewLabelChange: (value: string) => void;
  onNewKindChange: (value: QuoteItemKind) => void;
  onNewQtyChange: (value: number) => void;
  onNewUnitPriceChange: (value: number) => void;
  onNewDescriptionChange: (value: string) => void;
  onAddItem: () => void | Promise<void>;
  onDeleteItem: (itemId: string) => void | Promise<void>;
}

export function QuoteItemsTab({
  quote,
  canEdit,
  showAddItem,
  newLabel,
  newKind,
  newQty,
  newUnitPrice,
  newDescription,
  onOpenAddItem,
  onCancelAddItem,
  onNewLabelChange,
  onNewKindChange,
  onNewQtyChange,
  onNewUnitPriceChange,
  onNewDescriptionChange,
  onAddItem,
  onDeleteItem,
}: QuoteItemsTabProps) {
  const quoteItems = quote.items ?? [];

  const getDeleteButtonLabel = (label: string) =>
    label.length > 40 ? `${label.slice(0, 37)}...` : label;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Articles
          </CardTitle>
          {canEdit && (
            <Button onClick={onOpenAddItem} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un article
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {showAddItem && canEdit && (
          <div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h3 className="text-sm font-medium text-blue-900">Nouvel article</h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <div className="col-span-2 md:col-span-3">
                <Label htmlFor="newLabel">Libellé *</Label>
                <Input
                  id="newLabel"
                  value={newLabel}
                  onChange={(e) => onNewLabelChange(e.target.value)}
                  placeholder="Ex: PPF Capot"
                />
              </div>
              <div>
                <Label htmlFor="newKind">Type</Label>
                <select
                  id="newKind"
                  value={newKind}
                  onChange={(e) => onNewKindChange(e.target.value as QuoteItemKind)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="service">Service</option>
                  <option value="labor">Main d&apos;œuvre</option>
                  <option value="material">Matériel</option>
                  <option value="discount">Remise</option>
                </select>
              </div>
              <div>
                <Label htmlFor="newQty">Quantité</Label>
                <Input
                  id="newQty"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={newQty}
                  onChange={(e) => onNewQtyChange(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="newUnitPrice">Prix unitaire (€)</Label>
                <Input
                  id="newUnitPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newUnitPrice}
                  onChange={(e) =>
                    onNewUnitPriceChange(parseFloat(e.target.value) || 0)
                  }
                />
              </div>
            </div>
            <div>
              <Label htmlFor="newDescription">Description</Label>
              <Textarea
                id="newDescription"
                value={newDescription}
                onChange={(e) => onNewDescriptionChange(e.target.value)}
                placeholder="Description optionnelle de l'article"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onCancelAddItem}>
                Annuler
              </Button>
              <Button type="button" onClick={onAddItem} disabled={!newLabel.trim()}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter
              </Button>
            </div>
          </div>
        )}

        {quoteItems.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-border py-12 text-center">
            <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">Aucun article</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {canEdit ? "Ajoutez votre premier article" : "Ce devis ne contient aucun article"}
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    Article
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-medium text-muted-foreground md:table-cell">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    Type
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                    Qté
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                    P.U.
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                    Total
                  </th>
                  {canEdit && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {quoteItems.map((item) => {
                  const lineTotal = Math.round(item.qty * item.unit_price);

                  return (
                    <tr key={item.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-sm font-medium">{item.label}</td>
                      <td className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
                        {item.description || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs normal-case">
                          {item.kind}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                        {item.qty}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        {formatCents(item.unit_price)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold">
                        {formatCents(lineTotal)}
                      </td>
                      {canEdit && (
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Supprimer ${getDeleteButtonLabel(item.label)}`}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => onDeleteItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {quoteItems.length > 0 && (
          <div className="space-y-2 border-t pt-4 text-right">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Sous-total HT</span>
              <span className="font-semibold">{formatCents(quote.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">TVA</span>
              <span className="font-semibold">{formatCents(quote.tax_total)}</span>
            </div>
            <div className="my-2 h-px bg-border" />
            <div className="flex items-center justify-between">
              <span className="font-medium">Total TTC</span>
              <span className="text-xl font-bold text-primary">
                {formatCents(quote.total)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
