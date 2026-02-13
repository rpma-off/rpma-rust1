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
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useLogger } from '@/hooks/useLogger';
import { LogDomain } from '@/lib/logging/types';
import { useAuth } from '@/contexts/AuthContext';
import { settingsOperations } from '@/lib/ipc/domains/settings';
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
  Filter,
  Search,
  Zap,
  Clock,
  Target,
  PlusCircle,
  MinusCircle,
  Bell
} from 'lucide-react';
import { BusinessRule, RuleCondition, RuleAction, BusinessRuleCategory } from '@/types/configuration.types';

// Loading skeleton for business rules
const BusinessRulesSkeleton = () => (
  <div className="space-y-4">
    {[...Array(3)].map((_, i) => (
      <Card key={i} className="border">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-6 w-16" />
              </div>
              <Skeleton className="h-4 w-64" />
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Initialize logging
    const { logInfo, logError, logPerformance } = useLogger({
      context: LogDomain.SYSTEM,
      component: 'BusinessRulesTab',
      enablePerformanceLogging: true
    });

  // Form state for creating/editing rules
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'task_assignment' as BusinessRuleCategory,
    priority: 0,
    isActive: true,
    conditions: [] as RuleCondition[],
    actions: [] as RuleAction[]
  });

  const { session } = useAuth();

  const loadBusinessRules = useCallback(async () => {
    const timer = logPerformance('Load business rules');
    try {
      setLoading(true);
      logInfo('Loading business rules');

      const sessionToken = session?.token || '';
      const data = await settingsOperations.getAppSettings(sessionToken);
      const appSettings = data as Record<string, JsonValue>;
      const rules = (appSettings?.business_rules || []) as unknown as BusinessRule[];
      setBusinessRules(Array.isArray(rules) ? rules : []);
      logInfo('Business rules loaded successfully', {
        count: Array.isArray(rules) ? rules.length : 0,
      });
    } catch (error) {
      logError('Error loading business rules', { error: error instanceof Error ? error.message : error });
      toast.error('Erreur lors du chargement des règles métier');
      setBusinessRules([]);
    } finally {
      setLoading(false);
      timer();
    }
  }, [logPerformance, logInfo, logError, session?.token]);

  useEffect(() => {
    loadBusinessRules();
  }, [loadBusinessRules]);

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

      let updatedRules: BusinessRule[];
      if (editingRule) {
        updatedRules = businessRules.map(r => r.id === editingRule.id ? newRule : r);
      } else {
        updatedRules = [...businessRules, newRule];
      }

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
      console.error('Error saving rule:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const deleteRule = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette règle ?')) return;

    try {
      const sessionToken = session?.token || '';
      const updatedRules = businessRules.filter(r => r.id !== id);
      await settingsOperations.updateGeneralSettings(
        { business_rules: updatedRules as unknown as JsonValue } as Record<string, JsonValue>,
        sessionToken
      );
      toast.success('Règle supprimée avec succès');
      await loadBusinessRules();
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const toggleRuleStatus = async (id: string, isActive: boolean) => {
    try {
      const sessionToken = session?.token || '';
      const updatedRules = businessRules.map(r =>
        r.id === id ? { ...r, is_active: !isActive, isActive: !isActive } : r
      );
      await settingsOperations.updateGeneralSettings(
        { business_rules: updatedRules as unknown as JsonValue } as Record<string, JsonValue>,
        sessionToken
      );
      toast.success(`Règle ${!isActive ? 'activée' : 'désactivée'} avec succès`);
      await loadBusinessRules();
    } catch (error) {
      console.error('Error updating rule status:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const testRule = async (id: string) => {
    setTestingRule(id);
    try {
      const rule = businessRules.find(r => r.id === id);
      if (!rule) {
        toast.error('Règle introuvable');
        return;
      }
      // Validate rule structure locally
      if (rule.conditions.length === 0) {
        toast.warning('Validation: La règle n\'a aucune condition définie');
      } else if (rule.actions.length === 0) {
        toast.warning('Validation: La règle n\'a aucune action définie');
      } else {
        toast.success('Validation réussie: Structure de règle valide');
      }
    } catch (error) {
      console.error('Error testing rule:', error);
      toast.error('Erreur lors du test');
    } finally {
      setTestingRule(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'task_assignment',
      priority: 0,
      isActive: true,
      conditions: [],
      actions: []
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
      actions: rule.actions
    });
    setShowCreateDialog(true);
  };

  const addCondition = () => {
    setFormData(prev => ({
      ...prev,
      conditions: [...prev.conditions, {
        field: '',
        operator: 'equals',
        value: ''
      }]
    }));
  };

  const removeCondition = (index: number) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index)
    }));
  };

  const addAction = () => {
    setFormData(prev => ({
      ...prev,
      actions: [...prev.actions, {
        type: 'send_notification',
        target: '',
        value: ''
      }]
    }));
  };

  const removeAction = (index: number) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index)
    }));
  };

  const filteredRules = businessRules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (rule.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesCategory = filterCategory === 'all' || rule.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (category: string) => {
    const colors = {
      'task_assignment': 'blue',
      'notification': 'green',
      'validation': 'yellow',
      'automation': 'purple',
      'escalation': 'red'
    };
    return colors[category as keyof typeof colors] || 'gray';
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      'task_assignment': Target,
      'notification': Bell,
      'validation': CheckCircle,
      'automation': Zap,
      'escalation': AlertTriangle
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
      {/* Enhanced Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Workflow className="h-6 w-6 text-green-600" />
            Règles Métier
          </h2>
          <p className="text-gray-600 mt-1">
            Gérez les règles d&apos;automatisation et de validation de votre système
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={loadBusinessRules}
            disabled={loading}
            className="flex items-center gap-2"
          >
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

      {/* Stats Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        {[
          { label: 'Total', value: businessRules.length, icon: Workflow, color: 'blue' },
          { label: 'Actives', value: businessRules.filter(r => r.isActive).length, icon: CheckCircle, color: 'green' },
          { label: 'Inactives', value: businessRules.filter(r => !r.isActive).length, icon: Pause, color: 'gray' },
          { label: 'Catégories', value: new Set(businessRules.map(r => r.category)).size, icon: Settings, color: 'purple' }
        ].map((stat, index) => (
          <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`p-2 rounded-lg bg-${stat.color}-100`}>
                  <stat.icon className={`h-5 w-5 text-${stat.color}-600`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Filters and Search */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher des règles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-48">
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
        
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      {/* Rules List */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="space-y-4"
      >
        <AnimatePresence>
          {filteredRules.map((rule, index) => {
            const CategoryIcon = getCategoryIcon(rule.category);
            const categoryColor = getCategoryColor(rule.category);
            
            return (
              <motion.div
                key={rule.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <Card className="border hover:shadow-md transition-all duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-${categoryColor}-100`}>
                            <CategoryIcon className={`h-4 w-4 text-${categoryColor}-600`} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{rule.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className={`bg-${categoryColor}-100 text-${categoryColor}-700`}>
                                {rule.category.replace('_', ' ')}
                              </Badge>
                              <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                                {rule.isActive ? 'Actif' : 'Inactif'}
                              </Badge>
                              <Badge variant="outline">
                                Priorité {rule.priority}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-gray-600 text-sm">{rule.description}</p>
                        
                        <div className="flex items-center gap-6 text-sm text-gray-500">
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testRule(rule.id)}
                          disabled={testingRule === rule.id}
                        >
                          {testingRule === rule.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleRuleStatus(rule.id, rule.isActive ?? false)}
                        >
                          {rule.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(rule)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteRule(rule.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {filteredRules.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Workflow className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune règle trouvée</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || filterCategory !== 'all' 
                ? 'Aucune règle ne correspond à vos critères de recherche.'
                : 'Commencez par créer votre première règle métier.'
              }
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Créer une règle
            </Button>
          </motion.div>
        )}
      </motion.div>

      {/* Create/Edit Rule Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5" />
              {editingRule ? 'Modifier la règle' : 'Nouvelle règle métier'}
              </DialogTitle>
              <DialogDescription>
              {editingRule 
                ? 'Modifiez les paramètres de cette règle métier'
                : 'Créez une nouvelle règle pour automatiser votre système'
              }
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                <Label htmlFor="name">Nom de la règle</Label>
                  <Input
                  id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Assignation automatique des tâches"
                  />
                </div>

                <div className="space-y-2">
                <Label htmlFor="category">Catégorie</Label>
                <Select value={formData.category} onValueChange={(value: BusinessRuleCategory) => 
                  setFormData(prev => ({ ...prev, category: value }))
                }>
                    <SelectTrigger>
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
              <Label htmlFor="description">Description</Label>
                <Textarea
                id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Décrivez le comportement de cette règle..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                <Label htmlFor="priority">Priorité</Label>
                  <Input
                  id="priority"
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                  min="0"
                  max="100"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                  id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  />
                <Label htmlFor="isActive">Règle active</Label>
              </div>
              </div>

              {/* Conditions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Conditions</Label>
                <Button variant="outline" size="sm" onClick={addCondition}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Ajouter une condition
                  </Button>
                </div>

              <div className="space-y-3">
                {formData.conditions.map((condition, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50"
                  >
                    <div className="flex-1 grid grid-cols-3 gap-3">
                      <Input
                        placeholder="Champ"
                      value={condition.field}
                        onChange={(e) => {
                        const newConditions = [...formData.conditions];
                        if (newConditions[index]) {
                          newConditions[index].field = e.target.value;
                        }
                        setFormData(prev => ({ ...prev, conditions: newConditions }));
                      }}
                      />
                      <Select value={condition.operator} onValueChange={(value: RuleCondition['operator']) => {
                        const newConditions = [...formData.conditions];
                        if (newConditions[index]) {
                          newConditions[index].operator = value;
                        }
                        setFormData(prev => ({ ...prev, conditions: newConditions }));
                      }}>
                        <SelectTrigger>
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
                        placeholder="Valeur"
                      value={String(condition.value || '')}
                      onChange={(e) => {
                        const newConditions = [...formData.conditions];
                        if (newConditions[index]) {
                          newConditions[index].value = e.target.value;
                        }
                        setFormData(prev => ({ ...prev, conditions: newConditions }));
                      }}
                    />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeCondition(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <MinusCircle className="h-4 w-4" />
                    </Button>
                  </motion.div>
                ))}
              </div>
              </div>

              {/* Actions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Actions</Label>
                <Button variant="outline" size="sm" onClick={addAction}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Ajouter une action
                  </Button>
                </div>

              <div className="space-y-3">
                {formData.actions.map((action, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50"
                  >
                    <div className="flex-1">
                      <Select value={action.type} onValueChange={(value: RuleAction['type']) => {
                        const newActions = [...formData.actions];
                        if (newActions[index]) {
                          newActions[index].type = value;
                        }
                        setFormData(prev => ({ ...prev, actions: newActions }));
                      }}>
                        <SelectTrigger>
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
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeAction(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <MinusCircle className="h-4 w-4" />
                    </Button>
                  </motion.div>
                ))}
              </div>
            </div>
              </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Annuler
                </Button>
            <Button onClick={saveRule} disabled={saving}>
                  {saving ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </Button>
            </div>
          </DialogContent>
        </Dialog>
    </div>
  );
}
