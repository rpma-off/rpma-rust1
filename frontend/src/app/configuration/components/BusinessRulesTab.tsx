'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useLogger } from '@/hooks/useLogger';
import { LogDomain } from '@/lib/logging/types';
import { useAuth } from '@/contexts/AuthContext';
import { settingsOperations } from '@/lib/ipc';
import type { JsonValue } from '@/types/json';
import {
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Settings,
  Workflow,
  Search,
  Zap,
  Clock,
  Target,
  PlusCircle,
  MinusCircle,
  Bell,
} from 'lucide-react';
import { BusinessRule, RuleCondition, RuleAction, BusinessRuleCategory } from '@/types/configuration.types';

const STYLE_BY_CATEGORY: Record<string, { badge: string; iconWrap: string; icon: string }> = {
  task_assignment: { badge: 'bg-blue-100 text-blue-700', iconWrap: 'bg-blue-100', icon: 'text-blue-600' },
  notification: { badge: 'bg-green-100 text-green-700', iconWrap: 'bg-green-100', icon: 'text-green-600' },
  validation: { badge: 'bg-yellow-100 text-yellow-700', iconWrap: 'bg-yellow-100', icon: 'text-yellow-600' },
  automation: { badge: 'bg-purple-100 text-purple-700', iconWrap: 'bg-purple-100', icon: 'text-purple-600' },
  escalation: { badge: 'bg-red-100 text-red-700', iconWrap: 'bg-red-100', icon: 'text-red-600' },
};

const STAT_STYLES: Record<string, { wrap: string; icon: string }> = {
  blue: { wrap: 'bg-blue-100', icon: 'text-blue-600' },
  green: { wrap: 'bg-green-100', icon: 'text-green-600' },
  slate: { wrap: 'bg-slate-100', icon: 'text-slate-600' },
  purple: { wrap: 'bg-purple-100', icon: 'text-purple-600' },
};

const BusinessRulesSkeleton = () => (
  <div className="space-y-4">
    {[...Array(3)].map((_, i) => (
      <Card key={i} className="border border-[hsl(var(--rpma-border))]">
        <CardContent className="p-6">
          <div className="space-y-3">
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-4 w-80" />
            <Skeleton className="h-4 w-48" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

export function BusinessRulesTab() {
  const [businessRules, setBusinessRules] = useState<BusinessRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<BusinessRule | null>(null);
  const [testingRule, setTestingRule] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<BusinessRule | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'task_assignment' as BusinessRuleCategory,
    priority: 0,
    isActive: true,
    conditions: [] as RuleCondition[],
    actions: [] as RuleAction[],
  });

  const { session } = useAuth();
  const { logInfo, logError, logPerformance } = useLogger({
    context: LogDomain.SYSTEM,
    component: 'BusinessRulesTab',
    enablePerformanceLogging: true,
  });

  const loadBusinessRules = useCallback(async () => {
    const timer = logPerformance('Load business rules');
    try {
      setLoading(true);
      const sessionToken = session?.token || '';
      const data = await settingsOperations.getAppSettings(sessionToken);
      const appSettings = data as Record<string, JsonValue>;
      const rules = (appSettings?.business_rules || []) as unknown as BusinessRule[];
      setBusinessRules(Array.isArray(rules) ? rules : []);
      logInfo('Business rules loaded', { count: Array.isArray(rules) ? rules.length : 0 });
    } catch (error) {
      logError('Error loading business rules', { error: error instanceof Error ? error.message : error });
      toast.error('Erreur lors du chargement des règles métier');
      setBusinessRules([]);
    } finally {
      setLoading(false);
      timer();
    }
  }, [logError, logInfo, logPerformance, session?.token]);

  useEffect(() => {
    loadBusinessRules();
  }, [loadBusinessRules]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'task_assignment',
      priority: 0,
      isActive: true,
      conditions: [],
      actions: [],
    });
  };

  const openEditDialog = (rule: BusinessRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || '',
      category: rule.category as BusinessRuleCategory,
      priority: rule.priority,
      isActive: rule.isActive ?? false,
      conditions: rule.conditions,
      actions: rule.actions,
    });
    setShowCreateDialog(true);
  };

  const saveRule = async () => {
    setSaving(true);
    try {
      const sessionToken = session?.token || '';
      const newRule: BusinessRule = {
        id: editingRule?.id || crypto.randomUUID(),
        name: formData.name,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        is_active: formData.isActive,
        isActive: formData.isActive,
        conditions: formData.conditions,
        actions: formData.actions,
        created_at: editingRule?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        createdAt: editingRule?.createdAt || new Date().toISOString(),
      };

      const updatedRules = editingRule
        ? businessRules.map((rule) => (rule.id === editingRule.id ? newRule : rule))
        : [...businessRules, newRule];

      await settingsOperations.updateGeneralSettings(
        { business_rules: updatedRules as unknown as JsonValue } as Record<string, JsonValue>,
        sessionToken
      );
      toast.success(editingRule ? 'Règle mise à jour avec succès' : 'Règle créée avec succès');
      setShowCreateDialog(false);
      setEditingRule(null);
      resetForm();
      await loadBusinessRules();
    } catch (error) {
      logError('Error saving business rule', { error: error instanceof Error ? error.message : error });
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteRule = (rule: BusinessRule) => {
    setRuleToDelete(rule);
    setDeleteConfirmOpen(true);
  };

  const deleteRule = async () => {
    if (!ruleToDelete) return;
    try {
      const sessionToken = session?.token || '';
      const updatedRules = businessRules.filter((rule) => rule.id !== ruleToDelete.id);
      await settingsOperations.updateGeneralSettings(
        { business_rules: updatedRules as unknown as JsonValue } as Record<string, JsonValue>,
        sessionToken
      );
      toast.success('Règle supprimée avec succès');
      await loadBusinessRules();
    } catch (error) {
      logError('Error deleting business rule', { error: error instanceof Error ? error.message : error });
      toast.error('Erreur lors de la suppression');
    } finally {
      setRuleToDelete(null);
      setDeleteConfirmOpen(false);
    }
  };

  const toggleRuleStatus = async (id: string, isActive: boolean) => {
    try {
      const sessionToken = session?.token || '';
      const updatedRules = businessRules.map((rule) =>
        rule.id === id ? { ...rule, is_active: !isActive, isActive: !isActive } : rule
      );
      await settingsOperations.updateGeneralSettings(
        { business_rules: updatedRules as unknown as JsonValue } as Record<string, JsonValue>,
        sessionToken
      );
      toast.success(`Règle ${!isActive ? 'activée' : 'désactivée'} avec succès`);
      await loadBusinessRules();
    } catch (error) {
      logError('Error toggling business rule', { error: error instanceof Error ? error.message : error });
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const testRule = async (id: string) => {
    setTestingRule(id);
    try {
      const rule = businessRules.find((candidate) => candidate.id === id);
      if (!rule) {
        toast.error('Règle introuvable');
        return;
      }
      if (rule.conditions.length === 0) {
        toast.warning("Validation: la règle n'a aucune condition définie");
      } else if (rule.actions.length === 0) {
        toast.warning("Validation: la règle n'a aucune action définie");
      } else {
        toast.success('Validation réussie: structure de règle valide');
      }
    } catch (error) {
      logError('Error testing business rule', { error: error instanceof Error ? error.message : error });
      toast.error('Erreur lors du test');
    } finally {
      setTestingRule(null);
    }
  };

  const addCondition = () => {
    setFormData((prev) => ({
      ...prev,
      conditions: [...prev.conditions, { field: '', operator: 'equals', value: '' }],
    }));
  };

  const removeCondition = (index: number) => {
    setFormData((prev) => ({ ...prev, conditions: prev.conditions.filter((_, i) => i !== index) }));
  };

  const addAction = () => {
    setFormData((prev) => ({
      ...prev,
      actions: [...prev.actions, { type: 'send_notification', target: '', value: '' }],
    }));
  };

  const removeAction = (index: number) => {
    setFormData((prev) => ({ ...prev, actions: prev.actions.filter((_, i) => i !== index) }));
  };

  const filteredRules = businessRules.filter((rule) => {
    const matchesSearch =
      rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rule.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesCategory = filterCategory === 'all' || rule.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (category: string) => {
    const icons = {
      task_assignment: Target,
      notification: Bell,
      validation: CheckCircle,
      automation: Zap,
      escalation: AlertTriangle,
    };
    return icons[category as keyof typeof icons] || Settings;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <BusinessRulesSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Workflow className="h-6 w-6 text-[hsl(var(--rpma-teal))]" />
            Règles Métier
          </h2>
          <p className="text-muted-foreground mt-1">
            Gérez les règles d&apos;automatisation et de validation de votre système
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={loadBusinessRules} disabled={loading} className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setEditingRule(null);
              setShowCreateDialog(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nouvelle Règle
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: businessRules.length, icon: Workflow, style: 'blue' },
          { label: 'Actives', value: businessRules.filter((rule) => rule.isActive).length, icon: CheckCircle, style: 'green' },
          { label: 'Inactives', value: businessRules.filter((rule) => !rule.isActive).length, icon: Pause, style: 'slate' },
          { label: 'Catégories', value: new Set(businessRules.map((rule) => rule.category)).size, icon: Settings, style: 'purple' },
        ].map((stat, index) => {
          const styles = STAT_STYLES[stat.style];
          return (
            <Card key={index} className="border border-[hsl(var(--rpma-border))] shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${styles.wrap}`}>
                    <stat.icon className={`h-5 w-5 ${styles.icon}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher des règles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Filtrer par catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            <SelectItem value="task_assignment">Assignation de tâches</SelectItem>
            <SelectItem value="notification">Notifications</SelectItem>
            <SelectItem value="validation">Validation</SelectItem>
            <SelectItem value="automation">Automatisation</SelectItem>
            <SelectItem value="escalation">Escalade</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {filteredRules.map((rule) => {
          const CategoryIcon = getCategoryIcon(rule.category);
          const style = STYLE_BY_CATEGORY[rule.category] || {
            badge: 'bg-slate-100 text-slate-700',
            iconWrap: 'bg-slate-100',
            icon: 'text-slate-600',
          };
          return (
            <Card key={rule.id} className="border border-[hsl(var(--rpma-border))]">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${style.iconWrap}`}>
                        <CategoryIcon className={`h-4 w-4 ${style.icon}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{rule.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className={style.badge}>
                            {rule.category.replace('_', ' ')}
                          </Badge>
                          <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                            {rule.isActive ? 'Actif' : 'Inactif'}
                          </Badge>
                          <Badge variant="outline">Priorité {rule.priority}</Badge>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{rule.description}</p>
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Target className="h-4 w-4" />
                        {rule.conditions.length} condition{rule.conditions.length > 1 ? 's' : ''}
                      </div>
                      <div className="flex items-center gap-1">
                        <Zap className="h-4 w-4" />
                        {rule.actions.length} action{rule.actions.length > 1 ? 's' : ''}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Créée le {rule.createdAt ? new Date(rule.createdAt).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button variant="outline" size="sm" onClick={() => testRule(rule.id)} disabled={testingRule === rule.id}>
                      {testingRule === rule.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toggleRuleStatus(rule.id, rule.isActive ?? false)}>
                      {rule.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="sm" aria-label={`Modifier la règle ${rule.name}`} onClick={() => openEditDialog(rule)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Supprimer la règle ${rule.name}`}
                      onClick={() => confirmDeleteRule(rule)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredRules.length === 0 && (
          <div className="text-center py-12">
            <Workflow className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Aucune règle trouvée</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || filterCategory !== 'all'
                ? 'Aucune règle ne correspond à vos critères de recherche.'
                : 'Commencez par créer votre première règle métier.'}
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Créer une règle
            </Button>
          </div>
        )}
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5" />
              {editingRule ? 'Modifier la règle' : 'Nouvelle règle métier'}
            </DialogTitle>
            <DialogDescription>
              {editingRule ? 'Modifiez les paramètres de cette règle métier' : 'Créez une nouvelle règle pour automatiser votre système'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rule-name">Nom de la règle</Label>
                <Input
                  id="rule-name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rule-category">Catégorie</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: BusinessRuleCategory) => setFormData((prev) => ({ ...prev, category: value }))}
                >
                  <SelectTrigger id="rule-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="task_assignment">Assignation de tâches</SelectItem>
                    <SelectItem value="notification">Notifications</SelectItem>
                    <SelectItem value="validation">Validation</SelectItem>
                    <SelectItem value="automation">Automatisation</SelectItem>
                    <SelectItem value="escalation">Escalade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rule-description">Description</Label>
              <Textarea
                id="rule-description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rule-priority">Priorité</Label>
                <Input
                  id="rule-priority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData((prev) => ({ ...prev, priority: parseInt(e.target.value, 10) || 0 }))}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="rule-active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="rule-active">Règle active</Label>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Conditions</Label>
                <Button variant="outline" size="sm" onClick={addCondition}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Ajouter
                </Button>
              </div>
              {formData.conditions.map((condition, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center p-3 rounded-lg border border-[hsl(var(--rpma-border))]">
                  <Input
                    className="col-span-4"
                    placeholder="Champ"
                    value={condition.field}
                    onChange={(e) => {
                      const next = [...formData.conditions];
                      if (next[index]) next[index].field = e.target.value;
                      setFormData((prev) => ({ ...prev, conditions: next }));
                    }}
                  />
                  <Select
                    value={condition.operator}
                    onValueChange={(value: RuleCondition['operator']) => {
                      const next = [...formData.conditions];
                      if (next[index]) next[index].operator = value;
                      setFormData((prev) => ({ ...prev, conditions: next }));
                    }}
                  >
                    <SelectTrigger className="col-span-4">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equals">Égal à</SelectItem>
                      <SelectItem value="not_equals">Différent de</SelectItem>
                      <SelectItem value="greater_than">Supérieur à</SelectItem>
                      <SelectItem value="less_than">Inférieur à</SelectItem>
                      <SelectItem value="contains">Contient</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    className="col-span-3"
                    placeholder="Valeur"
                    value={String(condition.value || '')}
                    onChange={(e) => {
                      const next = [...formData.conditions];
                      if (next[index]) next[index].value = e.target.value;
                      setFormData((prev) => ({ ...prev, conditions: next }));
                    }}
                  />
                  <Button variant="outline" size="sm" className="col-span-1" onClick={() => removeCondition(index)}>
                    <MinusCircle className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Actions</Label>
                <Button variant="outline" size="sm" onClick={addAction}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Ajouter
                </Button>
              </div>
              {formData.actions.map((action, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center p-3 rounded-lg border border-[hsl(var(--rpma-border))]">
                  <Select
                    value={action.type}
                    onValueChange={(value: RuleAction['type']) => {
                      const next = [...formData.actions];
                      if (next[index]) next[index].type = value;
                      setFormData((prev) => ({ ...prev, actions: next }));
                    }}
                  >
                    <SelectTrigger className="col-span-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="send_notification">Envoyer une notification</SelectItem>
                      <SelectItem value="assign_task">Assigner une tâche</SelectItem>
                      <SelectItem value="update_priority">Mettre à jour la priorité</SelectItem>
                      <SelectItem value="block_completion">Bloquer la complétion</SelectItem>
                      <SelectItem value="notify_manager">Notifier le manager</SelectItem>
                      <SelectItem value="notify_technician">Notifier le technicien</SelectItem>
                      <SelectItem value="escalate">Escalader</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="col-span-2" onClick={() => removeAction(index)}>
                    <MinusCircle className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-[hsl(var(--rpma-border))]">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Annuler
              </Button>
              <Button onClick={saveRule} disabled={saving}>
                {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Supprimer la règle"
        description={`Voulez-vous vraiment supprimer la règle "${ruleToDelete?.name || ''}" ?`}
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="destructive"
        onConfirm={deleteRule}
      />
    </div>
  );
}
