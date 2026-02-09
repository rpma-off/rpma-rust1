import { ipcClient } from '../client';

jest.mock('../utils', () => ({
  safeInvoke: jest.fn(),
}));

jest.mock('../cache', () => ({
  cachedInvoke: jest.fn(),
  invalidatePattern: jest.fn(),
  getCacheStats: jest.fn(),
  invalidateKey: jest.fn(),
  clearCache: jest.fn(),
}));

const { safeInvoke } = jest.requireMock('../utils') as {
  safeInvoke: jest.Mock;
};

const { cachedInvoke, invalidatePattern } = jest.requireMock('../cache') as {
  cachedInvoke: jest.Mock;
  invalidatePattern: jest.Mock;
};

describe('ipcClient.interventions IPC argument shapes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    safeInvoke.mockResolvedValue('ok');
    cachedInvoke.mockResolvedValue({
      interventions: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        has_next: false,
        has_prev: false,
      },
    });
  });

  // Basic CRUD Operations
  describe('Intervention CRUD operations', () => {
    it('uses top-level sessionToken for interventions_list', async () => {
      await ipcClient.interventions.list('token-a', {
        page: 1,
        limit: 20,
        status: 'in_progress',
        task_id: 'task-123',
        technician_id: 'tech-123',
        start_date: '2025-02-01',
        end_date: '2025-02-28',
      });

      expect(safeInvoke).toHaveBeenCalledWith('interventions_list', {
        sessionToken: 'token-a',
        page: 1,
        limit: 20,
        status: 'in_progress',
        task_id: 'task-123',
        technician_id: 'tech-123',
        start_date: '2025-02-01',
        end_date: '2025-02-28',
      });
    });

    it('uses nested request.session_token for intervention_create', async () => {
      await ipcClient.interventions.create(
        {
          task_id: 'task-123',
          workflow_id: 'workflow-ppf-default',
          technician_id: 'tech-123',
          scheduled_date: '2025-02-15',
          notes: 'Standard PPF installation',
          custom_fields: {
            special_requirements: 'Customer wants extra protection',
          },
        },
        'token-b'
      );

      expect(safeInvoke).toHaveBeenCalledWith('intervention_create', {
        request: {
          task_id: 'task-123',
          workflow_id: 'workflow-ppf-default',
          technician_id: 'tech-123',
          scheduled_date: '2025-02-15',
          notes: 'Standard PPF installation',
          custom_fields: {
            special_requirements: 'Customer wants extra protection',
          },
          session_token: 'token-b',
        },
      });
    });

    it('uses top-level sessionToken for intervention_get', async () => {
      await ipcClient.interventions.get('intervention-123', 'token-c');

      expect(safeInvoke).toHaveBeenCalledWith('intervention_get', {
        sessionToken: 'token-c',
        id: 'intervention-123',
      });
    });

    it('uses nested request.session_token for intervention_update', async () => {
      await ipcClient.interventions.update(
        'intervention-123',
        {
          technician_id: 'tech-456',
          scheduled_date: '2025-02-20',
          notes: 'Updated intervention details',
        },
        'token-d'
      );

      expect(safeInvoke).toHaveBeenCalledWith('intervention_update', {
        id: 'intervention-123',
        request: {
          technician_id: 'tech-456',
          scheduled_date: '2025-02-20',
          notes: 'Updated intervention details',
          session_token: 'token-d',
        },
      });
    });
  });

  // Workflow Operations
  describe('Workflow operations', () => {
    it('uses nested request.session_token for start_intervention', async () => {
      await ipcClient.interventions.start(
        'intervention-123',
        {
          start_time: '2025-02-15T09:00:00Z',
          technician_id: 'tech-123',
          initial_notes: 'Starting PPF installation process',
          equipment_check: {
            heat_gun: true,
            squeegee: true,
            knife: true,
            spray_bottle: true,
          },
        },
        'token-e'
      );

      expect(safeInvoke).toHaveBeenCalledWith('intervention_start', {
        request: {
          intervention_id: 'intervention-123',
          start_time: '2025-02-15T09:00:00Z',
          technician_id: 'tech-123',
          initial_notes: 'Starting PPF installation process',
          equipment_check: {
            heat_gun: true,
            squeegee: true,
            knife: true,
            spray_bottle: true,
          },
          session_token: 'token-e',
        },
      });
    });

    it('uses nested request.session_token for advance_step', async () => {
      await ipcClient.interventions.advanceStep(
        'intervention-123',
        'step-123',
        {
          step_status: 'completed',
          duration_minutes: 45,
          notes: 'Surface preparation completed successfully',
          photos: ['photo-step1-1.jpg', 'photo-step1-2.jpg'],
          material_consumption: [
            {
              material_id: 'material-123',
              quantity_used: 15,
              waste_quantity: 2,
              batch_number: 'BATCH-001',
            },
          ],
        },
        'token-f'
      );

      expect(safeInvoke).toHaveBeenCalledWith('intervention_advance_step', {
        request: {
          intervention_id: 'intervention-123',
          step_id: 'step-123',
          step_status: 'completed',
          duration_minutes: 45,
          notes: 'Surface preparation completed successfully',
          photos: ['photo-step1-1.jpg', 'photo-step1-2.jpg'],
          material_consumption: [
            {
              material_id: 'material-123',
              quantity_used: 15,
              waste_quantity: 2,
              batch_number: 'BATCH-001',
            },
          ],
          session_token: 'token-f',
        },
      });
    });

    it('uses nested request.session_token for get_progress', async () => {
      await ipcClient.interventions.getProgress('intervention-123', 'token-g');

      expect(safeInvoke).toHaveBeenCalledWith('intervention_get_progress', {
        request: {
          intervention_id: 'intervention-123',
          session_token: 'token-g',
        },
      });
    });

    it('uses nested request.session_token for save_step_progress', async () => {
      await ipcClient.interventions.saveStepProgress(
        'intervention-123',
        'step-123',
        {
          progress_percentage: 75,
          current_phase: 'application',
          notes: 'Applying PPF film to hood',
          temporary_data: {
            temperature: 22,
            humidity: 45,
            air_flow: 'optimal',
          },
        },
        'token-h'
      );

      expect(safeInvoke).toHaveBeenCalledWith('intervention_save_step_progress', {
        request: {
          intervention_id: 'intervention-123',
          step_id: 'step-123',
          progress_percentage: 75,
          current_phase: 'application',
          notes: 'Applying PPF film to hood',
          temporary_data: {
            temperature: 22,
            humidity: 45,
            air_flow: 'optimal',
          },
          session_token: 'token-h',
        },
      });
    });

    it('uses nested request.session_token for finalize_intervention', async () => {
      await ipcClient.interventions.finalize(
        'intervention-123',
        {
          end_time: '2025-02-15T14:30:00Z',
          total_duration_minutes: 330,
          quality_score: 4.8,
          completion_notes: 'Installation completed with high quality',
          final_photos: ['photo-final-1.jpg', 'photo-final-2.jpg'],
          customer_signature: 'base64-signature-data',
          next_maintenance_date: '2025-08-15',
          warranty_info: {
            warranty_years: 5,
            warranty_type: 'standard',
          },
        },
        'token-i'
      );

      expect(safeInvoke).toHaveBeenCalledWith('intervention_finalize', {
        request: {
          intervention_id: 'intervention-123',
          end_time: '2025-02-15T14:30:00Z',
          total_duration_minutes: 330,
          quality_score: 4.8,
          completion_notes: 'Installation completed with high quality',
          final_photos: ['photo-final-1.jpg', 'photo-final-2.jpg'],
          customer_signature: 'base64-signature-data',
          next_maintenance_date: '2025-08-15',
          warranty_info: {
            warranty_years: 5,
            warranty_type: 'standard',
          },
          session_token: 'token-i',
        },
      });
    });
  });

  // Task-specific Operations
  describe('Task-specific operations', () => {
    it('uses top-level sessionToken for get_active_by_task', async () => {
      await ipcClient.interventions.getActiveByTask('task-123', 'token-j');

      expect(safeInvoke).toHaveBeenCalledWith('interventions_get_active_by_task', {
        sessionToken: 'token-j',
        task_id: 'task-123',
      });
    });

    it('uses top-level sessionToken for get_latest_by_task', async () => {
      await ipcClient.interventions.getLatestByTask('task-123', 'token-k');

      expect(safeInvoke).toHaveBeenCalledWith('interventions_get_latest_by_task', {
        sessionToken: 'token-k',
        task_id: 'task-123',
      });
    });

    it('uses nested request.session_token for create_from_task', async () => {
      await ipcClient.interventions.createFromTask(
        'task-123',
        {
          workflow_id: 'workflow-ppf-premium',
          technician_id: 'tech-456',
          scheduled_date: '2025-02-20',
          priority: 'high',
          notes: 'Premium PPF installation for repeat customer',
        },
        'token-l'
      );

      expect(safeInvoke).toHaveBeenCalledWith('intervention_create_from_task', {
        request: {
          task_id: 'task-123',
          workflow_id: 'workflow-ppf-premium',
          technician_id: 'tech-456',
          scheduled_date: '2025-02-20',
          priority: 'high',
          notes: 'Premium PPF installation for repeat customer',
          session_token: 'token-l',
        },
      });
    });
  });

  // Photo Integration Operations
  describe('Photo integration operations', () => {
    it('uses nested request.session_token for upload_step_photo', async () => {
      await ipcClient.interventions.uploadStepPhoto(
        'intervention-123',
        'step-123',
        {
          photo_data: 'base64-photo-data',
          photo_type: 'before',
          description: 'Before photo of surface preparation',
          metadata: {
            camera: 'iPhone 14',
            timestamp: '2025-02-15T10:30:00Z',
            location: 'workshop_bay_3',
          },
        },
        'token-m'
      );

      expect(safeInvoke).toHaveBeenCalledWith('intervention_upload_step_photo', {
        request: {
          intervention_id: 'intervention-123',
          step_id: 'step-123',
          photo_data: 'base64-photo-data',
          photo_type: 'before',
          description: 'Before photo of surface preparation',
          metadata: {
            camera: 'iPhone 14',
            timestamp: '2025-02-15T10:30:00Z',
            location: 'workshop_bay_3',
          },
          session_token: 'token-m',
        },
      });
    });

    it('uses nested request.session_token for delete_photo', async () => {
      await ipcClient.interventions.deletePhoto(
        'photo-123',
        {
          reason: 'Duplicate photo uploaded',
        },
        'token-n'
      );

      expect(safeInvoke).toHaveBeenCalledWith('intervention_delete_photo', {
        request: {
          photo_id: 'photo-123',
          reason: 'Duplicate photo uploaded',
          session_token: 'token-n',
        },
      });
    });

    it('uses top-level sessionToken for get_photos', async () => {
      await ipcClient.interventions.getPhotos('intervention-123', 'token-o', {
        step_id: 'step-123',
        photo_type: 'before',
        page: 1,
        limit: 20,
      });

      expect(safeInvoke).toHaveBeenCalledWith('intervention_get_photos', {
        sessionToken: 'token-o',
        intervention_id: 'intervention-123',
        step_id: 'step-123',
        photo_type: 'before',
        page: 1,
        limit: 20,
      });
    });
  });

  // Material Tracking Operations
  describe('Material tracking operations', () => {
    it('uses nested request.session_token for record_material_usage', async () => {
      await ipcClient.interventions.recordMaterialUsage(
        'intervention-123',
        'step-123',
        {
          material_id: 'material-123',
          quantity_used: 15.5,
          waste_quantity: 2.3,
          unit_of_measure: 'meter',
          batch_number: 'BATCH-001',
          quality_notes: 'Good material quality',
          application_method: 'wet_application',
        },
        'token-p'
      );

      expect(safeInvoke).toHaveBeenCalledWith('intervention_record_material_usage', {
        request: {
          intervention_id: 'intervention-123',
          step_id: 'step-123',
          material_id: 'material-123',
          quantity_used: 15.5,
          waste_quantity: 2.3,
          unit_of_measure: 'meter',
          batch_number: 'BATCH-001',
          quality_notes: 'Good material quality',
          application_method: 'wet_application',
          session_token: 'token-p',
        },
      });
    });

    it('uses top-level sessionToken for get_material_consumption', async () => {
      await ipcClient.interventions.getMaterialConsumption('intervention-123', 'token-q');

      expect(safeInvoke).toHaveBeenCalledWith('intervention_get_material_consumption', {
        sessionToken: 'token-q',
        intervention_id: 'intervention-123',
      });
    });
  });

  // Quality Control Operations
  describe('Quality control operations', () => {
    it('uses nested request.session_token for create_quality_check', async () => {
      await ipcClient.interventions.createQualityCheck(
        'intervention-123',
        'step-123',
        {
          check_type: 'visual_inspection',
          quality_score: 4.5,
          issues_found: ['minor_bubble_near_edge'],
          notes: 'Overall good quality with minor bubble that was fixed',
          photos: ['quality-check-1.jpg'],
          inspector_id: 'inspector-123',
        },
        'token-r'
      );

      expect(safeInvoke).toHaveBeenCalledWith('intervention_create_quality_check', {
        request: {
          intervention_id: 'intervention-123',
          step_id: 'step-123',
          check_type: 'visual_inspection',
          quality_score: 4.5,
          issues_found: ['minor_bubble_near_edge'],
          notes: 'Overall good quality with minor bubble that was fixed',
          photos: ['quality-check-1.jpg'],
          inspector_id: 'inspector-123',
          session_token: 'token-r',
        },
      });
    });

    it('uses top-level sessionToken for get_quality_checks', async () => {
      await ipcClient.interventions.getQualityChecks('intervention-123', 'token-s');

      expect(safeInvoke).toHaveBeenCalledWith('intervention_get_quality_checks', {
        sessionToken: 'token-s',
        intervention_id: 'intervention-123',
      });
    });
  });

  // Cache Invalidation Tests
  describe('Cache invalidation', () => {
    it('invalidates cache patterns for intervention_update', async () => {
      await ipcClient.interventions.update(
        'intervention-123',
        {
          technician_id: 'tech-456',
          notes: 'Updated intervention details',
        },
        'token-d'
      );

      expect(invalidatePattern).toHaveBeenCalledWith('interventions:*');
      expect(invalidatePattern).toHaveBeenCalledWith('intervention:*');
    });

    it('invalidates cache patterns for advance_step', async () => {
      await ipcClient.interventions.advanceStep(
        'intervention-123',
        'step-123',
        {
          step_status: 'completed',
          duration_minutes: 45,
        },
        'token-f'
      );

      expect(invalidatePattern).toHaveBeenCalledWith('interventions:*');
      expect(invalidatePattern).toHaveBeenCalledWith('intervention:*');
    });

    it('invalidates cache patterns for finalize_intervention', async () => {
      await ipcClient.interventions.finalize(
        'intervention-123',
        {
          end_time: '2025-02-15T14:30:00Z',
          total_duration_minutes: 330,
          quality_score: 4.8,
        },
        'token-i'
      );

      expect(invalidatePattern).toHaveBeenCalledWith('interventions:*');
      expect(invalidatePattern).toHaveBeenCalledWith('intervention:*');
    });

    it('invalidates cache patterns for upload_step_photo', async () => {
      await ipcClient.interventions.uploadStepPhoto(
        'intervention-123',
        'step-123',
        {
          photo_data: 'base64-photo-data',
          photo_type: 'before',
        },
        'token-m'
      );

      expect(invalidatePattern).toHaveBeenCalledWith('intervention:*');
      expect(invalidatePattern).toHaveBeenCalledWith('intervention:photos:*');
    });
  });

  // Response Shape Tests
  describe('Response shape validation', () => {
    it('returns expected shape for interventions_list', async () => {
      const mockResponse = {
        success: true,
        data: {
          interventions: [
            {
              id: 'intervention-123',
              task_id: 'task-123',
              workflow_id: 'workflow-123',
              technician_id: 'tech-123',
              status: 'in_progress',
              scheduled_date: '2025-02-15',
              created_at: '2025-02-09T10:00:00Z',
              updated_at: '2025-02-09T10:00:00Z',
            },
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            has_next: false,
            has_prev: false,
          },
        },
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await ipcClient.interventions.list('token-a');

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('interventions');
      expect(result.data).toHaveProperty('pagination');
      expect(Array.isArray(result.data.interventions)).toBe(true);
      expect(result.data.interventions[0]).toHaveProperty('id');
      expect(result.data.interventions[0]).toHaveProperty('task_id');
      expect(result.data.interventions[0]).toHaveProperty('status');
    });

    it('returns expected shape for intervention_get', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'intervention-123',
          task_id: 'task-123',
          workflow_id: 'workflow-123',
          technician_id: 'tech-123',
          status: 'in_progress',
          start_time: '2025-02-15T09:00:00Z',
          scheduled_date: '2025-02-15',
          notes: 'Standard PPF installation',
          current_step: {
            id: 'step-123',
            name: 'Surface Preparation',
            status: 'in_progress',
            started_at: '2025-02-15T09:15:00Z',
          },
          progress: {
            completed_steps: 2,
            total_steps: 8,
            percentage: 25,
          },
          created_at: '2025-02-09T10:00:00Z',
          updated_at: '2025-02-15T09:15:00Z',
        },
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await ipcClient.interventions.get('intervention-123', 'token-c');

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('task_id');
      expect(result.data).toHaveProperty('status');
      expect(result.data).toHaveProperty('current_step');
      expect(result.data).toHaveProperty('progress');
      expect(result.data.progress).toHaveProperty('percentage');
    });

    it('returns expected shape for get_progress', async () => {
      const mockResponse = {
        success: true,
        data: {
          intervention_id: 'intervention-123',
          status: 'in_progress',
          progress_percentage: 65,
          current_step: {
            id: 'step-456',
            name: 'Film Application',
            status: 'in_progress',
            started_at: '2025-02-15T11:00:00Z',
            estimated_completion: '2025-02-15T12:30:00Z',
          },
          completed_steps: [
            {
              id: 'step-123',
              name: 'Surface Preparation',
              status: 'completed',
              duration_minutes: 45,
              completed_at: '2025-02-15T10:00:00Z',
            },
            {
              id: 'step-234',
              name: 'Film Cutting',
              status: 'completed',
              duration_minutes: 30,
              completed_at: '2025-02-15T10:45:00Z',
            },
          ],
          remaining_steps: [
            {
              id: 'step-567',
              name: 'Final Inspection',
              status: 'pending',
              estimated_duration: 20,
            },
          ],
        },
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await ipcClient.interventions.getProgress('intervention-123', 'token-g');

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('intervention_id');
      expect(result.data).toHaveProperty('progress_percentage');
      expect(result.data).toHaveProperty('current_step');
      expect(result.data).toHaveProperty('completed_steps');
      expect(result.data).toHaveProperty('remaining_steps');
      expect(Array.isArray(result.data.completed_steps)).toBe(true);
      expect(Array.isArray(result.data.remaining_steps)).toBe(true);
    });

    it('returns expected shape for get_material_consumption', async () => {
      const mockResponse = {
        success: true,
        data: {
          intervention_id: 'intervention-123',
          total_cost: 155.75,
          materials: [
            {
              material_id: 'material-123',
              material_name: 'Clear PPF Film',
              material_type: 'ppf_film',
              quantity_used: 10.0,
              unit_of_measure: 'meter',
              unit_cost: 15.50,
              waste_quantity: 1.5,
              waste_reason: 'Trimming',
              total_cost: 155.75,
              step_id: 'step-123',
              step_name: 'Film Application',
              recorded_at: '2025-02-15T12:00:00Z',
              recorded_by: 'tech-123',
            },
          ],
          summary: {
            total_quantity_used: 10.0,
            total_waste: 1.5,
            waste_percentage: 15.0,
            material_types_used: 1,
          },
        },
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await ipcClient.interventions.getMaterialConsumption('intervention-123', 'token-q');

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('intervention_id');
      expect(result.data).toHaveProperty('total_cost');
      expect(result.data).toHaveProperty('materials');
      expect(result.data).toHaveProperty('summary');
      expect(Array.isArray(result.data.materials)).toBe(true);
      expect(result.data.materials[0]).toHaveProperty('material_id');
      expect(result.data.materials[0]).toHaveProperty('quantity_used');
      expect(result.data.materials[0]).toHaveProperty('total_cost');
    });
  });

  // Error Response Tests
  describe('Error response handling', () => {
    it('handles validation errors for intervention_create', async () => {
      const mockResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Task ID is required',
          details: {
            field: 'task_id',
            value: '',
          },
        },
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await ipcClient.interventions.create(
        {
          technician_id: 'tech-123',
          workflow_id: 'workflow-123',
        },
        'token-b'
      );

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(result.error).toHaveProperty('message');
    });

    it('handles workflow errors for start_intervention', async () => {
      const mockResponse = {
        success: false,
        error: {
          code: 'WORKFLOW_ERROR',
          message: 'Intervention cannot be started without assigned technician',
          details: {
            intervention_id: 'intervention-123',
            required_field: 'technician_id',
          },
        },
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await ipcClient.interventions.start(
        'intervention-123',
        {
          start_time: '2025-02-15T09:00:00Z',
          notes: 'Starting intervention',
        },
        'token-e'
      );

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error).toHaveProperty('code', 'WORKFLOW_ERROR');
    });

    it('handles step transition errors for advance_step', async () => {
      const mockResponse = {
        success: false,
        error: {
          code: 'STEP_TRANSITION_ERROR',
          message: 'Step cannot be advanced until previous step is completed',
          details: {
            current_step_id: 'step-123',
            current_step_status: 'in_progress',
            previous_step_id: 'step-234',
            previous_step_status: 'pending',
          },
        },
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await ipcClient.interventions.advanceStep(
        'intervention-123',
        'step-123',
        {
          step_status: 'completed',
        },
        'token-f'
      );

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error).toHaveProperty('code', 'STEP_TRANSITION_ERROR');
    });

    it('handles not found errors for intervention_get', async () => {
      const mockResponse = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Intervention not found',
          details: {
            intervention_id: 'non-existent-intervention',
          },
        },
      };

      safeInvoke.mockResolvedValue(mockResponse);

      const result = await ipcClient.interventions.get('non-existent-intervention', 'token-c');

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error).toHaveProperty('code', 'NOT_FOUND');
    });
  });
});