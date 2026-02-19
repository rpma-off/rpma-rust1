/**
 * Workflow Templates Service
 * Manages SOP templates and workflow definitions
 */

export interface SOPTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  steps: SOPStep[];
  estimatedDuration: number;
  requiredSkills: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SOPStep {
  id: string;
  templateId: string;
  stepNumber: number;
  title: string;
  description: string;
  instructions: string;
  estimatedDuration: number;
  requiredPhotos: number;
  qualityCheckpoints: string[];
  isMandatory: boolean;
}

export interface SOPInstruction {
  id: string;
  templateId: string;
  stepId: string;
  type?: string;
  description: string;
  order: number;
  mediaUrl?: string;
  isRequired: boolean;
  sopInstructions?: SOPInstruction[];
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  steps: WorkflowStepTemplate[];
  estimatedDuration: number;
  requiredSkills: string[];
  createdAt: string;
  updatedAt: string;
  is_active?: boolean;
  version?: string;
}

export interface WorkflowStepTemplate {
  id: string;
  templateId: string;
  stepNumber: number;
  title: string;
  description: string;
  instructions: string;
  estimatedDuration: number;
  requiredPhotos: number;
  qualityCheckpoints: string[];
  isRequired: boolean;
  iconType?: string;
  requiresPhotos?: boolean;
  requiresSignature?: boolean;
  sopInstructions?: SOPInstruction[];
  checklistItems?: Array<{ type?: string; [key: string]: unknown }>;
}

type TemplateStore = Map<string, WorkflowTemplate>;

const DEFAULT_WORKFLOW_TEMPLATE: WorkflowTemplate = {
  id: 'ppf_installation',
  name: 'PPF Installation Standard',
  description: 'Workflow standard pour les interventions PPF.',
  category: 'ppf_installation',
  estimatedDuration: 240,
  requiredSkills: ['ppf', 'inspection', 'quality_control'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  is_active: true,
  version: '1.0.0',
  steps: [
    {
      id: 'inspection',
      templateId: 'ppf_installation',
      stepNumber: 1,
      title: 'Inspection',
      description: 'Inspection initiale du véhicule et de la surface.',
      instructions: 'Vérifier l’état global et documenter les défauts.',
      estimatedDuration: 30,
      requiredPhotos: 4,
      qualityCheckpoints: ['surface_clean', 'defects_logged'],
      isRequired: true,
      iconType: 'camera',
      requiresPhotos: true,
      requiresSignature: false,
      sopInstructions: [
        {
          id: 'inspection-1',
          templateId: 'ppf_installation',
          stepId: 'inspection',
          type: 'instruction',
          description: 'Capturer les photos avant intervention.',
          order: 1,
          isRequired: true,
        },
      ],
      checklistItems: [{ type: 'quality', key: 'surface_clean' }],
    },
    {
      id: 'preparation',
      templateId: 'ppf_installation',
      stepNumber: 2,
      title: 'Préparation',
      description: 'Préparer la surface et les matériaux.',
      instructions: 'Nettoyer, décontaminer et préparer les zones.',
      estimatedDuration: 45,
      requiredPhotos: 2,
      qualityCheckpoints: ['surface_prepared'],
      isRequired: true,
      iconType: 'tool',
      requiresPhotos: false,
      requiresSignature: false,
      checklistItems: [{ type: 'quality', key: 'surface_prepared' }],
    },
    {
      id: 'installation',
      templateId: 'ppf_installation',
      stepNumber: 3,
      title: 'Installation',
      description: 'Poser le film PPF selon la zone.',
      instructions: 'Appliquer le film et contrôler les bulles/alignements.',
      estimatedDuration: 120,
      requiredPhotos: 4,
      qualityCheckpoints: ['film_aligned', 'edges_sealed'],
      isRequired: true,
      iconType: 'shield',
      requiresPhotos: true,
      requiresSignature: false,
      checklistItems: [{ type: 'quality', key: 'film_aligned' }],
    },
    {
      id: 'finalization',
      templateId: 'ppf_installation',
      stepNumber: 4,
      title: 'Finalisation',
      description: 'Contrôles finaux et validation client.',
      instructions: 'Finaliser le dossier et enregistrer la signature client.',
      estimatedDuration: 45,
      requiredPhotos: 2,
      qualityCheckpoints: ['quality_check_complete', 'client_signature'],
      isRequired: true,
      iconType: 'signature',
      requiresPhotos: true,
      requiresSignature: true,
      checklistItems: [{ type: 'quality', key: 'quality_check_complete' }],
    },
  ],
};

function cloneTemplate(template: WorkflowTemplate): WorkflowTemplate {
  return {
    ...template,
    steps: template.steps.map((step) => ({
      ...step,
      qualityCheckpoints: [...step.qualityCheckpoints],
      sopInstructions: step.sopInstructions ? step.sopInstructions.map((instruction) => ({ ...instruction })) : undefined,
      checklistItems: step.checklistItems ? step.checklistItems.map((item) => ({ ...item })) : undefined,
    })),
    requiredSkills: [...template.requiredSkills],
  };
}

function toSopTemplate(template: WorkflowTemplate): SOPTemplate {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    category: template.category,
    estimatedDuration: template.estimatedDuration,
    requiredSkills: [...template.requiredSkills],
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
    steps: template.steps.map((step) => ({
      id: step.id,
      templateId: step.templateId,
      stepNumber: step.stepNumber,
      title: step.title,
      description: step.description,
      instructions: step.instructions,
      estimatedDuration: step.estimatedDuration,
      requiredPhotos: step.requiredPhotos,
      qualityCheckpoints: [...step.qualityCheckpoints],
      isMandatory: step.isRequired,
    })),
  };
}

function fromSopTemplate(template: Omit<SOPTemplate, 'id' | 'createdAt' | 'updatedAt'>, id: string): WorkflowTemplate {
  const now = new Date().toISOString();
  return {
    id,
    name: template.name,
    description: template.description,
    category: template.category,
    estimatedDuration: template.estimatedDuration,
    requiredSkills: [...template.requiredSkills],
    createdAt: now,
    updatedAt: now,
    is_active: true,
    version: '1.0.0',
    steps: template.steps.map((step) => ({
      id: step.id,
      templateId: id,
      stepNumber: step.stepNumber,
      title: step.title,
      description: step.description,
      instructions: step.instructions,
      estimatedDuration: step.estimatedDuration,
      requiredPhotos: step.requiredPhotos,
      qualityCheckpoints: [...step.qualityCheckpoints],
      isRequired: step.isMandatory,
      requiresPhotos: step.requiredPhotos > 0,
      requiresSignature: false,
      checklistItems: step.qualityCheckpoints.map((checkpoint) => ({ type: 'quality', key: checkpoint })),
    })),
  };
}

export class WorkflowTemplatesService {
  private static instance: WorkflowTemplatesService;
  private readonly templates: TemplateStore = new Map<string, WorkflowTemplate>();

  private constructor() {
    this.templates.set(DEFAULT_WORKFLOW_TEMPLATE.id, cloneTemplate(DEFAULT_WORKFLOW_TEMPLATE));
  }

  static getInstance(): WorkflowTemplatesService {
    if (!WorkflowTemplatesService.instance) {
      WorkflowTemplatesService.instance = new WorkflowTemplatesService();
    }
    return WorkflowTemplatesService.instance;
  }

  async getTemplates(category?: string): Promise<SOPTemplate[]> {
    const templates = Array.from(this.templates.values());
    const filtered = category
      ? templates.filter((template) => template.category === category)
      : templates;
    return filtered.map((template) => toSopTemplate(cloneTemplate(template)));
  }

  async getTemplateById(id: string): Promise<SOPTemplate | null> {
    const template = this.templates.get(id);
    if (!template) return null;
    return toSopTemplate(cloneTemplate(template));
  }

  async createTemplate(template: Omit<SOPTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<SOPTemplate> {
    const id = `template-${Date.now()}`;
    const workflowTemplate = fromSopTemplate(template, id);
    this.templates.set(id, workflowTemplate);
    return toSopTemplate(cloneTemplate(workflowTemplate));
  }

  async updateTemplate(id: string, updates: Partial<SOPTemplate>): Promise<SOPTemplate> {
    const current = this.templates.get(id);
    if (!current) {
      throw new Error(`Template ${id} not found`);
    }

    const updated: WorkflowTemplate = {
      ...current,
      name: updates.name ?? current.name,
      description: updates.description ?? current.description,
      category: updates.category ?? current.category,
      estimatedDuration: updates.estimatedDuration ?? current.estimatedDuration,
      requiredSkills: updates.requiredSkills ? [...updates.requiredSkills] : current.requiredSkills,
      steps: updates.steps
        ? updates.steps.map((step) => ({
            id: step.id,
            templateId: id,
            stepNumber: step.stepNumber,
            title: step.title,
            description: step.description,
            instructions: step.instructions,
            estimatedDuration: step.estimatedDuration,
            requiredPhotos: step.requiredPhotos,
            qualityCheckpoints: [...step.qualityCheckpoints],
            isRequired: step.isMandatory,
            requiresPhotos: step.requiredPhotos > 0,
            requiresSignature: false,
            checklistItems: step.qualityCheckpoints.map((checkpoint) => ({ type: 'quality', key: checkpoint })),
          }))
        : current.steps,
      updatedAt: new Date().toISOString(),
    };

    this.templates.set(id, updated);
    return toSopTemplate(cloneTemplate(updated));
  }

  async deleteTemplate(id: string): Promise<void> {
    this.templates.delete(id);
  }

  async getStepTemplate(templateId: string, stepId: string): Promise<SOPInstruction[]> {
    const template = this.templates.get(templateId);
    if (!template) return [];
    const step = template.steps.find((candidate) => candidate.id === stepId);
    return step?.sopInstructions ? step.sopInstructions.map((instruction) => ({ ...instruction })) : [];
  }

  async getWorkflowTemplate(taskType: string): Promise<WorkflowTemplate> {
    const direct = this.templates.get(taskType);
    if (direct) return cloneTemplate(direct);

    const byCategory = Array.from(this.templates.values()).find((template) => template.category === taskType);
    if (byCategory) return cloneTemplate(byCategory);

    return cloneTemplate(DEFAULT_WORKFLOW_TEMPLATE);
  }

  async validateStep(taskType: string, stepId: string, stepData: Record<string, unknown>): Promise<{ isValid: boolean; errors: string[] }> {
    const template = await this.getWorkflowTemplate(taskType);
    const step = template.steps.find((candidate) => candidate.id === stepId);
    if (!step) {
      return { isValid: false, errors: [`Unknown step: ${stepId}`] };
    }

    const errors: string[] = [];
    if (step.isRequired && (!stepData || Object.keys(stepData).length === 0)) {
      errors.push(`Step "${step.title}" requires data`);
    }

    if (step.requiresPhotos) {
      const photoList = stepData.photos;
      const photos = Array.isArray(photoList) ? photoList : [];
      if (photos.length < step.requiredPhotos) {
        errors.push(`Step "${step.title}" requires at least ${step.requiredPhotos} photo(s)`);
      }
    }

    if (step.requiresSignature && !stepData.customer_signature && !stepData.signature) {
      errors.push(`Step "${step.title}" requires a signature`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export const workflowTemplatesService = WorkflowTemplatesService.getInstance();
