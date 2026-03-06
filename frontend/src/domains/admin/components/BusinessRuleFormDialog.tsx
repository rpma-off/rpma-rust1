'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Save,
  RefreshCw,
  Workflow,
  PlusCircle,
  MinusCircle,
} from 'lucide-react';
import type { RuleCondition, RuleAction, BusinessRuleCategory, BusinessRule } from '@/shared/types';

interface BusinessRuleFormData {
  name: string;
  description: string;
  category: BusinessRuleCategory;
  priority: number;
  isActive: boolean;
  conditions: RuleCondition[];
  actions: RuleAction[];
}

interface BusinessRuleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRule: BusinessRule | null;
  formData: BusinessRuleFormData;
  setFormData: React.Dispatch<React.SetStateAction<BusinessRuleFormData>>;
  saving: boolean;
  onSave: () => void;
  onAddCondition: () => void;
  onRemoveCondition: (index: number) => void;
  onAddAction: () => void;
  onRemoveAction: (index: number) => void;
}

export function BusinessRuleFormDialog({
  open,
  onOpenChange,
  editingRule,
  formData,
  setFormData,
  saving,
  onSave,
  onAddCondition,
  onRemoveCondition,
  onAddAction,
  onRemoveAction,
}: BusinessRuleFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              <Button variant="outline" size="sm" onClick={onAddCondition}>
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
                <Button variant="outline" size="sm" className="col-span-1" onClick={() => onRemoveCondition(index)}>
                  <MinusCircle className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Actions</Label>
              <Button variant="outline" size="sm" onClick={onAddAction}>
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
                <Button variant="outline" size="sm" className="col-span-2" onClick={() => onRemoveAction(index)}>
                  <MinusCircle className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-[hsl(var(--rpma-border))]">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={onSave} disabled={saving}>
              {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
