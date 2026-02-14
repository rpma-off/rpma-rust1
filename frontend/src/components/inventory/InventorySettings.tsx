'use client';

import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Settings, Plus, Tag } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';
import type { MaterialCategory } from '@/lib/inventory';

export function InventorySettings() {
  const { t } = useTranslation();
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
    try {
      setLoading(true);
      setError(null);
      const result = await invoke<MaterialCategory[]>('material_list_categories', {
        sessionToken: '',
        activeOnly: true,
      });
      setCategories(result);
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await invoke('material_create_category', {
        sessionToken: '',
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
      fetchCategories();
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
      <h2 className="text-2xl font-bold text-foreground">{t('inventory.settings')}</h2>

      {/* Categories Management */}
      <Card className="rpma-shell">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground flex items-center gap-2">
            <Tag className="w-5 h-5" />
            {t('inventory.categories')} ({categories.length})
          </CardTitle>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                {t('inventory.addCategory')}
              </Button>
            </DialogTrigger>
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
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="rpma-empty py-8">
              <Settings className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">{t('inventory.noCategories')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="rpma-table-header">
                  <TableHead>{t('inventory.categoryName')}</TableHead>
                  <TableHead>{t('inventory.categoryCode')}</TableHead>
                  <TableHead>{t('inventory.categoryDescription')}</TableHead>
                  <TableHead>{t('inventory.categoryColor')}</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id} className="border-border">
                    <TableCell className="text-foreground font-medium">{category.name}</TableCell>
                    <TableCell className="text-foreground font-mono">{category.code || '—'}</TableCell>
                    <TableCell className="text-foreground">{category.description || '—'}</TableCell>
                    <TableCell>
                      {category.color ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full border"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="text-foreground text-sm">{category.color}</span>
                        </div>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={category.is_active ? "default" : "secondary"}>
                        {category.is_active ? 'Actif' : 'Inactif'}
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
