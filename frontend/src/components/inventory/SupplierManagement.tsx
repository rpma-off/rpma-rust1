'use client';

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Truck, Plus } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';
import type { Supplier } from '@/lib/inventory';

export function SupplierManagement() {
  const { t } = useTranslation();
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
    try {
      setLoading(true);
      setError(null);
      const result = await invoke<Supplier[]>('material_list_suppliers', {
        sessionToken: '',
        activeOnly: true,
      });
      setSuppliers(result);
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await invoke('material_create_supplier', {
        sessionToken: '',
        request: formData,
      });
      toast.success(t('inventory.supplierCreated'));
      setShowForm(false);
      setFormData({ name: '', email: '', phone: '', website: '', lead_time_days: 0, is_preferred: false });
      fetchSuppliers();
    } catch (err) {
      toast.error(`${t('errors.generic')}: ${err}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <Card className="rpma-shell">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            {t('errors.generic')}: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t('inventory.suppliers')}</h2>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {t('inventory.addSupplier')}
            </Button>
          </DialogTrigger>
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
              <div className="grid grid-cols-2 gap-4">
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
                  onChange={(e) => setFormData(prev => ({ ...prev, lead_time_days: parseInt(e.target.value) || 0 }))}
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
      </div>

      <Card className="rpma-shell">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Truck className="w-5 h-5" />
            {t('inventory.suppliers')} ({suppliers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {suppliers.length === 0 ? (
            <div className="rpma-empty py-8">
              <Truck className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">{t('inventory.noSuppliers')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="rpma-table-header">
                  <TableHead>{t('inventory.supplierName')}</TableHead>
                  <TableHead>{t('inventory.supplierEmail')}</TableHead>
                  <TableHead>{t('inventory.supplierPhone')}</TableHead>
                  <TableHead>{t('inventory.supplierLeadTime')}</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id} className="border-border">
                    <TableCell className="text-foreground font-medium">
                      {supplier.name}
                      {supplier.is_preferred && (
                        <Badge className="ml-2 bg-[hsl(var(--rpma-teal))] text-white text-xs">
                          {t('inventory.supplierPreferred')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-foreground">{supplier.email || '—'}</TableCell>
                    <TableCell className="text-foreground">{supplier.phone || '—'}</TableCell>
                    <TableCell className="text-foreground">{supplier.lead_time_days}j</TableCell>
                    <TableCell>
                      <Badge variant={supplier.is_active ? "default" : "secondary"}>
                        {supplier.is_active ? 'Actif' : 'Inactif'}
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
