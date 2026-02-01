export type FormStep = typeof ENHANCED_STEPS[number]['id'];

export interface TaskFormData {
  // Core identification
  id?: string;
  task_number: string;
  title?: string;
  external_id?: string;
  status: 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold' | 'pending' | 'invalid' | 'archived' | 'failed' | 'overdue' | 'assigned' | 'paused';
  
  // User relationships
  created_by: string;
  creator_id: string;
  technician_id?: string | null;
  
  // Vehicle information
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year?: string;
  vehicle_plate: string;
  vehicle_vin?: string;
  
  // Customer information
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  client_id?: string | null;
  
  // PPF zones
  ppf_zones: string[];
  custom_ppf_zones: string[];
  customZones?: Record<string, string>; // For managing custom zone IDs to text mapping
  
  // Scheduling
  scheduled_date: string;
  scheduled_time: string;
  start_time?: string;
  end_time?: string;
  scheduled_at?: string;
  
  // Additional information
  notes?: string;
  lot_film?: string;
  
  // Workflow management
  workflow_status?: 'not_started' | 'in_progress' | 'paused' | 'completed' | 'cancelled';
  is_available?: boolean;
  checklist_completed?: boolean;
  checklist_id?: string;
  
  // Timestamps
  created_at?: string;
  updated_at?: string;
  started_at?: string;
  completed_at?: string | null;
  assigned_at?: string;
  
  // Enhanced fields for better task management
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  estimated_duration?: number; // in minutes
  actual_duration?: number; // in minutes
  cost?: number;
  payment_status?: 'unpaid' | 'partial' | 'paid';
  payment_method?: string;
  vehicle_color?: string;
  vehicle_mileage?: number;
  vehicle_condition?: 'excellent' | 'good' | 'fair' | 'poor';
  additional_services?: string[];
  
  // Materials tracking
  materials_used?: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string;
    cost_per_unit: number;
  }>;
  
  // Image management
  images?: Array<{
    id: string;
    url: string;
    description: string;
    type: 'before' | 'after' | 'during' | 'damage';
    created_at: string;
  }>;
  
  // History tracking
  history?: Array<{
    id: string;
    action: string;
    details: string;
    timestamp: string;
    user_id: string;
    user_name: string;
  }>;
  
  // Workflow
  workflow_id?: string;
  current_workflow_step_id?: string;
  completed_steps?: Record<string, boolean>;

  // Backend compatibility fields
  description?: string;
  tags?: string; // JSON string of tags
  template_id?: string;
}

export interface TaskFormProps {
  /** Callback function called when the form is successfully submitted */
  onSuccess?: (task?: { id: string }) => void;
  /** Callback when the form is cancelled */
  onCancel?: () => void;
  /** Initial form data for editing an existing task */
  initialData?: Partial<TaskFormData>;
  /** Whether the form is in edit mode */
  isEditing?: boolean;
  /** Whether to show the form in a modal */
  isModal?: boolean;
  /** Whether to show the form header */
  showHeader?: boolean;
  /** Custom submit button text */
  submitButtonText?: string;
  /** Custom cancel button text */
  cancelButtonText?: string;
  /** Custom class name for the form container */
  className?: string;
  /** Whether to show the loading state */
  isLoading?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Callback when the form data changes */
  onChange?: (data: TaskFormData) => void;
}

export interface FormStepProps {
  formData: TaskFormData;
  onChange: (updates: Partial<TaskFormData>) => void;
  errors: Record<string, string>;
  isLoading?: boolean;
  sessionToken?: string;
}

export interface PPFZone {
  id: string;
  name: string;
  category?: 'front' | 'rear' | 'side' | 'roof' | 'full' | 'custom';
  description?: string;
}

/**
 * Enhanced form steps with template selection
 */
export const ENHANCED_STEPS = [
  { 
    id: 'vehicle' as const, 
    label: 'Véhicule', 
    icon: 'car',
    description: 'Informations du véhicule',
    fields: ['vehicle_make', 'vehicle_model', 'vehicle_year', 'vehicle_plate', 'vehicle_vin']
  },
  { 
    id: 'customer' as const, 
    label: 'Client', 
    icon: 'user',
    description: 'Informations client',
    fields: ['customer_name', 'customer_email', 'customer_phone', 'customer_address']
  },
  { 
    id: 'ppf' as const, 
    label: 'Zones PPF', 
    icon: 'box-select',
    description: 'Zones à protéger',
    fields: ['ppf_zones', 'custom_ppf_zones', 'lot_film']
  },
  { 
    id: 'schedule' as const, 
    label: 'Planification', 
    icon: 'calendar',
    description: 'Date et horaires',
    fields: ['scheduled_date', 'scheduled_time', 'start_time', 'end_time', 'notes']
  },
] as const;

/**
 * Default enhanced form data
 */
export const DEFAULT_FORM_DATA: TaskFormData = {
  task_number: '',
  title: '',
   status: 'draft',
  created_by: '',
  creator_id: '',
  vehicle_make: '',
  vehicle_model: '',
   vehicle_year: undefined,
   vehicle_plate: '',
  vehicle_vin: '',
  customer_name: '',
  customer_email: '',
  customer_phone: '',
  customer_address: '',
  ppf_zones: [],
  custom_ppf_zones: [],
  customZones: {},
  scheduled_date: '',
  scheduled_time: '',
  start_time: '09:00',
  end_time: '17:00',
  notes: '',
  lot_film: '',
  workflow_status: 'not_started',
  is_available: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
   priority: undefined,
  payment_status: 'unpaid',
  additional_services: [],
  materials_used: [],
  images: [],
  history: [],
  completed_steps: {},
} as const;

/**
 * Enhanced validation rules for all form fields
 */
export const ENHANCED_VALIDATION_RULES = {
  // Vehicle fields
  vehicle_make: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9\s\-'\.]+$/,
    message: 'La marque doit contenir entre 2 et 50 caractères'
  },
  vehicle_model: {
    required: true,
    minLength: 1,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9\s\-'\.]+$/,
    message: 'Le modèle est requis (50 caractères max)'
  },
   vehicle_year: {
     required: false,
     min: 1900,
     max: new Date().getFullYear() + 1,
     message: `L'année doit être entre 1900 et ${new Date().getFullYear() + 1}`
   },
  vehicle_plate: {
    required: true,
    minLength: 4,
    maxLength: 15,
    pattern: /^[a-zA-Z0-9\s\-]+$/,
    message: 'La plaque doit contenir entre 4 et 15 caractères'
  },
  vehicle_vin: {
    required: false,
    length: 17,
    pattern: /^[A-HJ-NPR-Z0-9]{17}$/i,
    message: 'Le VIN doit contenir exactement 17 caractères alphanumériques (sans I, O, Q)'
  },
  
  // Customer fields
  customer_name: {
    required: false,
    maxLength: 100,
    pattern: /^[a-zA-Z\s\-'\.]+$/,
    message: 'Le nom ne doit contenir que des lettres (100 caractères max)'
  },
  customer_email: {
    required: false,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Format d\'email invalide'
  },
  customer_phone: {
    required: false,
    pattern: /^(\+33|0)[1-9](\d{8})$/,
    message: 'Format de téléphone français invalide (ex: 06 12 34 56 78)'
  },
  customer_address: {
    required: false,
    maxLength: 200,
    message: 'L\'adresse ne doit pas dépasser 200 caractères'
  },
  
  // PPF fields
  ppf_zones: {
    required: true,
    minLength: 1,
    maxLength: 20,
    message: 'Sélectionnez au moins une zone PPF (20 max)'
  },
  lot_film: {
    required: false,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9\-]+$/,
    message: 'Le numéro de lot ne doit contenir que des caractères alphanumériques et tirets'
  },
  
  // Schedule fields
  scheduled_date: {
    required: true,
    min: new Date().toISOString().split('T')[0],
    max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    message: 'La date doit être dans les 12 prochains mois'
  },
  scheduled_time: {
    required: true,
    pattern: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
    message: 'Format d\'heure invalide (HH:MM)'
  },
  start_time: {
    required: false,
    pattern: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
    message: 'Format d\'heure de début invalide (HH:MM)'
  },
  end_time: {
    required: false,
    pattern: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
    message: 'Format d\'heure de fin invalide (HH:MM)'
  },
  notes: {
    required: false,
    maxLength: 1000,
    message: 'Les notes ne doivent pas dépasser 1000 caractères'
  }
} as const;

/**
 * Available PPF zones with categories
 */
export const PPF_ZONES: PPFZone[] = [
  // Front zones
  { id: 'front_bumper', name: 'Pare-chocs avant', category: 'front' },
  { id: 'front_fenders', name: 'Ailes avant', category: 'front' },
  { id: 'hood', name: 'Capot', category: 'front' },
  { id: 'headlights', name: 'Phares', category: 'front' },
  { id: 'front_grille', name: 'Calandre', category: 'front' },
  
  // Side zones
  { id: 'side_mirrors', name: 'Rétroviseurs', category: 'side' },
  { id: 'door_handles', name: 'Poignées de porte', category: 'side' },
  { id: 'side_panels', name: 'Panneaux latéraux', category: 'side' },
  { id: 'rocker_panels', name: 'Bas de caisse', category: 'side' },
  
  // Rear zones
  { id: 'rear_bumper', name: 'Pare-chocs arrière', category: 'rear' },
  { id: 'rear_fenders', name: 'Ailes arrière', category: 'rear' },
  { id: 'trunk_lid', name: 'Coffre', category: 'rear' },
  { id: 'taillights', name: 'Feux arrière', category: 'rear' },
  
  // Roof zones
  { id: 'roof', name: 'Toit', category: 'roof' },
  { id: 'sunroof', name: 'Toit ouvrant', category: 'roof' },
  { id: 'roof_rails', name: 'Barres de toit', category: 'roof' },
  
  // Full coverage
  { id: 'full_front', name: 'Avant complet', category: 'full' },
  { id: 'full_vehicle', name: 'Véhicule complet', category: 'full' },
];

/**
 * Common vehicle makes for autocomplete
 */
export const VEHICLE_MAKES = [
  'Audi', 'BMW', 'Mercedes-Benz', 'Volkswagen', 'Porsche',
  'Peugeot', 'Renault', 'Citroën', 'Opel', 'Ford',
  'Toyota', 'Honda', 'Nissan', 'Mazda', 'Subaru',
  'Volvo', 'Jaguar', 'Land Rover', 'Bentley', 'Rolls-Royce',
  'Ferrari', 'Lamborghini', 'Maserati', 'Alfa Romeo',
  'Fiat', 'Jeep', 'Dodge', 'Chrysler', 'Cadillac',
  'Chevrolet', 'Buick', 'GMC', 'Lincoln', 'Tesla',
] as const;

/**
 * Time slots for scheduling
 */
export const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00'
] as const;