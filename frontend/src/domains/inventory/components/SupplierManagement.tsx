'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Truck, Plus } from 'lucide-react';
import { LoadingState } from '@/components/layout/LoadingState';
import { ErrorState } from '@/components/layout/ErrorState';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import { useTranslation } from '@/shared/hooks/useTranslation';
import { useAuth } from '@/domains/auth';
import type { Supplier } from '@/lib/inventory';
import { safeInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';

export function SupplierManagement() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    website: '',
    lead_time_days: 0,
    is_preferred: false,
  });

  const fetchSuppliers = useCallback(async () => {
    if (!user?.token) {
      setSuppliers([]);
      setError(t('errors.unauthorized'));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await safeInvoke<Supplier[]>(IPC_COMMANDS.MATERIAL_LIST_SUPPLIERS, {
        sessionToken: user.token,
        activeOnly: true,
      });
      setSuppliers(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [t, user?.token]);

  useEffect(() => {
    void fetchSuppliers();
  }, [fetchSuppliers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.token) {
      toast.error(t('errors.unauthorized'));
      return;
    }

    try {
      setSaving(true);
      await safeInvoke(IPC_COMMANDS.MATERIAL_CREATE_SUPPLIER, {
        sessionToken: user.token,
        request: formData,
      });
      toast.success(t('inventory.supplierCreated'));
      setShowForm(false);
      setFormData({ name: '', email: '', phone: '', website: '', lead_time_days: 0, is_preferred: false });
      await fetchSuppliers();
    } catch (err) {
      toast.error(`${t('errors.generic')}: ${err}`);
    } finally {
      setSaving(false);
    }
  };

  if (!user?.token) {
    return <ErrorState message={t('errors.unauthorized')} />;
  }

  if (loading) {
    return <LoadingState message={t('common.loading')} />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchSuppliers} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">{t('inventory.suppliers')}</h2>
          <p className="text-muted-foreground">{t('inventory.suppliersDesc')}</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('inventory.addSupplier')}
        </Button>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg bg-white border-[hsl(var(--rpma-border))]">
          <DialogHeader>
            <DialogTitle className="text-foreground">{t('inventory.addSupplier')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="supplier-name" className="text-foreground">{t('inventory.supplierName')} *</Label>
              <Input
                id="supplier-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="supplier-email" className="text-foreground">{t('inventory.supplierEmail')}</Label>
                <Input
                  id="supplier-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="supplier-phone" className="text-foreground">{t('inventory.supplierPhone')}</Label>
                <Input
                  id="supplier-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="supplier-website" className="text-foreground">{t('inventory.supplierWebsite')}</Label>
              <Input
                id="supplier-website"
                value={formData.website}
                onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="supplier-lead" className="text-foreground">{t('inventory.supplierLeadTime')}</Label>
              <Input
                id="supplier-lead"
                type="number"
                value={formData.lead_time_days}
                onChange={(e) => setFormData(prev => ({ ...prev, lead_time_days: parseInt(e.target.value, 10) || 0 }))}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="supplier-preferred"
                checked={formData.is_preferred}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_preferred: !!checked }))}
              />
              <Label htmlFor="supplier-preferred" className="text-foreground">{t('inventory.supplierPreferred')}</Label>
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={saving || !formData.name.trim()}>
                {saving ? t('inventory.saving') : t('inventory.addSupplier')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="rpma-shell">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Truck className="w-5 h-5" />
            {t('inventory.suppliers')} ({suppliers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {suppliers.length === 0 ? (
            <EmptyState
              icon={<Truck className="w-10 h-10" />}
              title={t('inventory.noSuppliers')}
              description={t('inventory.noSuppliersDesc')}
              action={<Button onClick={() => setShowForm(true)}>{t('inventory.addSupplier')}</Button>}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="rpma-table-header">
                  <TableHead>{t('inventory.supplierName')}</TableHead>
                  <TableHead>{t('inventory.supplierEmail')}</TableHead>
                  <TableHead>{t('inventory.supplierPhone')}</TableHead>
                  <TableHead>{t('inventory.supplierLeadTime')}</TableHead>
                  <TableHead>{t('inventory.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id} className="border-border hover:bg-[hsl(var(--rpma-surface))]/35">
                    <TableCell className="text-foreground font-medium">
                      {supplier.name}
                      {supplier.is_preferred && (
                        <Badge className="ml-2 bg-[hsl(var(--rpma-teal))] text-white text-xs">
                          {t('inventory.supplierPreferred')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-foreground">{supplier.email || t('common.notDefined')}</TableCell>
                    <TableCell className="text-foreground">{supplier.phone || t('common.notDefined')}</TableCell>
                    <TableCell className="text-foreground">{supplier.lead_time_days}j</TableCell>
                    <TableCell>
                      <Badge variant={supplier.is_active ? 'default' : 'secondary'}>
                        {supplier.is_active ? t('inventory.active') : t('inventory.inactive')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
