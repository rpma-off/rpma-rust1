'use client';

import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import {
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  RefreshCw,
  CheckCircle,
  Settings,
  Workflow,
  Search,
  Zap,
  Clock,
  Target,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatDate } from '@/shared/utils/date-formatters';
import { useBusinessRules } from '../hooks/useBusinessRules';

const BusinessRuleFormDialog = dynamic(
  () => import('./BusinessRuleFormDialog').then((mod) => ({ default: mod.BusinessRuleFormDialog })),
  { ssr: false }
);

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
  const {
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
    loadBusinessRules,
    openEditDialog,
    saveRule,
    confirmDeleteRule,
    deleteRule,
    toggleRuleStatus,
    testRule,
    filteredRules,
    getCategoryIcon,
  } = useBusinessRules();

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
          if (!styles) return null;
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
                        Créée le {rule.createdAt ? formatDate(rule.createdAt) : 'N/A'}
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

      <BusinessRuleFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        editingRule={editingRule}
        saving={saving}
        onSave={saveRule}
      />

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

