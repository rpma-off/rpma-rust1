import type { StepType } from '@/lib/backend';
import { Search, Wrench, Layers, BadgeCheck } from 'lucide-react';

export const PPF_STEP_CONFIG: Record<
  StepType,
  {
    label: string;
    description: string;
    duration: string;
    icon: typeof Search;
  }
> = {
  inspection: {
    label: 'Inspection',
    description: 'État du véhicule, défauts pré-existants, photos, conditions (temp/hum)',
    duration: '~12 min',
    icon: Search,
  },
  preparation: {
    label: 'Préparation',
    description: 'Dégraissage surface, découpe du film, vérification matériaux',
    duration: '~18 min',
    icon: Wrench,
  },
  installation: {
    label: 'Installation',
    description: 'Pose du film PPF zone par zone avec contrôle qualité continu',
    duration: '~45 min',
    icon: Layers,
  },
  finalization: {
    label: 'Finalisation',
    description: 'Inspection finale, photos, notes et validation client',
    duration: '~8 min',
    icon: BadgeCheck,
  },
};
