'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useLogger } from '@/shared/hooks/useLogger';
import { LogDomain } from '@/shared/utils';
import { useAuth } from '@/domains/auth';
import { settingsOperations } from '@/shared/utils';
import type { JsonValue } from '@/shared/types';
import {
  AlertTriangle,
  CheckCircle,
  Settings,
  Zap,
  Target,
  Bell,
} from 'lucide-react';
import type { BusinessRule, RuleCondition, RuleAction, BusinessRuleCategory } from '@/shared/types';

export function useBusinessRules() {
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

  return {
    businessRules,
    loading,
    saving,
    showCreateDialog,
    setShowCreateDialog,
    editingRule,
    setEditingRule,
    testingRule,
    searchTerm,
    setSearchTerm,
    filterCategory,
    setFilterCategory,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    ruleToDelete,
    formData,
    setFormData,
    loadBusinessRules,
    resetForm,
    openEditDialog,
    saveRule,
    confirmDeleteRule,
    deleteRule,
    toggleRuleStatus,
    testRule,
    addCondition,
    removeCondition,
    addAction,
    removeAction,
    filteredRules,
    getCategoryIcon,
  };
}
