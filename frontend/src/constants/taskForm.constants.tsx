import { Car, MapPin, Calendar } from 'lucide-react';
import { ReactElement } from 'react';

interface StepConfig {
  id: string;
  label: string;
  icon: ReactElement;
}

/**
 * Default form data for a new task
 */
export const defaultFormData = {
  title: '',
  status: 'draft' as const,
  technician_id: '',
  vehicle_plate: '',
  vehicle_make: '',
  vehicle_model: '',
  vehicle_year: '',
  scheduled_date: '',
  start_time: '',
  end_time: '',
  ppf_zones: [] as string[],
  notes: '',
  customZones: {} as Record<string, string>,
  description: '',
  priority: 'medium' as const,
};

/**
 * Configuration for each step in the task creation form
 */
export const STEPS: StepConfig[] = [
  { id: 'vehicle', label: 'Véhicule', icon: <Car className="w-4 h-4" /> },
  { id: 'ppf', label: 'Zones PPF', icon: <MapPin className="w-4 h-4" /> },
  { id: 'schedule', label: 'Planning', icon: <Calendar className="w-4 h-4" /> },
];

/**
 * Default time slots for scheduling
 */
export const DEFAULT_TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00'
];

/**
 * Standard PPF zones that can be selected
 */
export const STANDARD_PPF_ZONES = [
  'Pack 1',
  'Pack 2',
  'Pack 3',
  'Bas de caisse',
  'Pare-chocs arrière',
  'Autre (précisez)'
];

/**
 * Default time values for task scheduling
 */
export const DEFAULT_TIMES = {
  start: '09:00',
  end: '10:00'
};