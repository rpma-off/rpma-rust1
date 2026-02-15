'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Settings, Plus, Tag } from 'lucide-react';
import { LoadingState } from '@/components/layout/LoadingState';
import { ErrorState } from '@/components/layout/ErrorState';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuth } from '@/lib/auth/compatibility';
import type { MaterialCategory } from '@/lib/inventory';
import { safeInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';

export function InventorySettings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    color: '',
  });

  const fetchCategories = useCallback(async () => {
    if (!user?.token) {
      setCategories([]);
      setError(t('errors.unauthorized'));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await safeInvoke<MaterialCategory[]>(IPC_COMMANDS.MATERIAL_LIST_CATEGORIES, {
        sessionToken: user.token,
        activeOnly: true,
      });
      setCategories(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [t, user?.token]);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.token) {
      toast.error(t('errors.unauthorized'));
      return;
    }

    try {
      setSaving(true);
      await safeInvoke(IPC_COMMANDS.MATERIAL_CREATE_CATEGORY, {
        sessionToken: user.token,
        request: {
          name: formData.name,
          code: formData.code || null,
          description: formData.description || null,
          color: formData.color || null,
        },
      });
      toast.success(t('inventory.categoryCreated'));
      setShowForm(false);
      setFormData({ name: '', code: '', description: '', color: '' });
      await fetchCategories();
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
    return <ErrorState message={error} onRetry={fetchCategories} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">{t('inventory.settings')}</h2>
          <p className="text-muted-foreground">{t('inventory.settingsDesc')}</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('inventory.addCategory')}
        </Button>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md bg-white border-[hsl(var(--rpma-border))]">
          <DialogHeader>
            <DialogTitle className="text-foreground">{t('inventory.addCategory')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="cat-name" className="text-foreground">{t('inventory.categoryName')} *</Label>
              <Input
                id="cat-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="cat-code" className="text-foreground">{t('inventory.categoryCode')}</Label>
              <Input
                id="cat-code"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="cat-desc" className="text-foreground">{t('inventory.categoryDescription')}</Label>
              <Textarea
                id="cat-desc"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="cat-color" className="text-foreground">{t('inventory.categoryColor')}</Label>
              <Input
                id="cat-color"
                type="color"
                value={formData.color || '#000000'}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={saving || !formData.name.trim()}>
                {saving ? t('inventory.saving') : t('inventory.addCategory')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="rpma-shell">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Tag className="w-5 h-5" />
            {t('inventory.categories')} ({categories.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <EmptyState
              icon={<Settings className="w-10 h-10" />}
              title={t('inventory.noCategories')}
              description={t('inventory.noCategoriesDesc')}
              action={<Button onClick={() => setShowForm(true)}>{t('inventory.addCategory')}</Button>}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="rpma-table-header">
                  <TableHead>{t('inventory.categoryName')}</TableHead>
                  <TableHead>{t('inventory.categoryCode')}</TableHead>
                  <TableHead>{t('inventory.categoryDescription')}</TableHead>
                  <TableHead>{t('inventory.categoryColor')}</TableHead>
                  <TableHead>{t('inventory.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id} className="border-border hover:bg-[hsl(var(--rpma-surface))]/35">
                    <TableCell className="text-foreground font-medium">{category.name}</TableCell>
                    <TableCell className="text-foreground font-mono">{category.code || t('common.notDefined')}</TableCell>
                    <TableCell className="text-foreground">{category.description || t('common.notDefined')}</TableCell>
                    <TableCell>
                      {category.color ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: category.color }} />
                          <span className="text-foreground text-sm">{category.color}</span>
                        </div>
                      ) : (
                        t('common.notDefined')
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={category.is_active ? 'default' : 'secondary'}>
                        {category.is_active ? t('inventory.active') : t('inventory.inactive')}
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
