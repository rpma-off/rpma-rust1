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

export class WorkflowTemplatesService {
  private static instance: WorkflowTemplatesService;

  static getInstance(): WorkflowTemplatesService {
    if (!WorkflowTemplatesService.instance) {
      WorkflowTemplatesService.instance = new WorkflowTemplatesService();
    }
    return WorkflowTemplatesService.instance;
  }

  async getTemplates(_category?: string): Promise<SOPTemplate[]> {
    // Implementation would fetch from backend
    throw new Error('Not implemented');
  }

  async getTemplateById(_id: string): Promise<SOPTemplate | null> {
    // Implementation would fetch from backend
    throw new Error('Not implemented');
  }

  async createTemplate(_template: Omit<SOPTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<SOPTemplate> {
    // Implementation would create via backend
    throw new Error('Not implemented');
  }

  async updateTemplate(_id: string, _updates: Partial<SOPTemplate>): Promise<SOPTemplate> {
    // Implementation would update via backend
    throw new Error('Not implemented');
  }

  async deleteTemplate(_id: string): Promise<void> {
    // Implementation would delete via backend
    throw new Error('Not implemented');
  }

  async getStepTemplate(_templateId: string, _stepId: string): Promise<SOPInstruction[]> {
    // Implementation would fetch from backend
    throw new Error('Not implemented');
  }

  async getWorkflowTemplate(_taskType: string): Promise<WorkflowTemplate> {
    // Implementation would fetch from backend
    throw new Error('Not implemented');
  }

  async validateStep(_taskType: string, _stepId: string, _stepData: Record<string, unknown>): Promise<{ isValid: boolean; errors: string[] }> {
    // Implementation would validate step data
    throw new Error('Not implemented');
  }
}

export const workflowTemplatesService = WorkflowTemplatesService.getInstance();
