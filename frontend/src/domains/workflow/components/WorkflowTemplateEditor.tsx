'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, X, Plus, Trash2 } from 'lucide-react';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  steps: Array<{
    id: string;
    name: string;
    description?: string;
    order: number;
    required: boolean;
    estimated_duration?: number;
  }>;
}

interface WorkflowTemplateEditorProps {
  template?: WorkflowTemplate;
  onSave: (template: Omit<WorkflowTemplate, 'id'> | WorkflowTemplate) => void;
  onCancel: () => void;
}

export function WorkflowTemplateEditor({ template, onSave, onCancel }: WorkflowTemplateEditorProps) {
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [category, setCategory] = useState(template?.category || 'general');
  const [steps, setSteps] = useState(template?.steps || []);

  const handleSave = () => {
    const data: Omit<WorkflowTemplate, 'id'> | WorkflowTemplate = template
      ? { ...template, name, description, category, steps }
      : { name, description, category, steps };

    onSave(data);
  };

  const addStep = () => {
    const newStep = {
      id: `step-${Date.now()}`,
      name: '',
      description: '',
      order: steps.length,
      required: false,
      estimated_duration: undefined,
    };
    setSteps([...steps, newStep]);
  };

  const updateStep = (index: number, updates: Partial<typeof steps[0]>) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    setSteps(newSteps);
  };

  const removeStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    setSteps(newSteps);
  };

  return (
    <Card className="rpma-shell max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{template ? 'Modifier le modèle' : 'Nouveau modèle de workflow'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="template-name">Nom du modèle</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Installation PPF Standard"
            />
          </div>
          <div>
            <Label htmlFor="template-category">Catégorie</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ppf">PPF</SelectItem>
                <SelectItem value="ceramic">Céramique</SelectItem>
                <SelectItem value="general">Général</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="template-description">Description</Label>
          <Textarea
            id="template-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description du modèle de workflow..."
            rows={3}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Étapes</h3>
            <Button onClick={addStep} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une étape
            </Button>
          </div>

          {steps.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-md">
              Aucune étape définie. Cliquez sur "Ajouter une étape" pour commencer.
            </div>
          ) : (
            <div className="space-y-3">
              {steps.map((step, index) => (
                <Card key={step.id} className="rpma-surface">
                  <CardContent className="p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <Input
                          value={step.name}
                          onChange={(e) => updateStep(index, { name: e.target.value })}
                          placeholder="Nom de l'étape"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={step.estimated_duration || ''}
                          onChange={(e) => updateStep(index, { estimated_duration: parseInt(e.target.value) || undefined })}
                          placeholder="Durée (min)"
                          className="flex-1"
                        />
                        <Button
                          onClick={() => removeStep(index)}
                          variant="outline"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      value={step.description}
                      onChange={(e) => updateStep(index, { description: e.target.value })}
                      placeholder="Description de l'étape (optionnel)"
                      rows={2}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button onClick={onCancel} variant="outline">
            <X className="w-4 h-4 mr-2" />
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={!name || steps.length === 0}>
            <Save className="w-4 h-4 mr-2" />
            Enregistrer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
