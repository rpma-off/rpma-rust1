import type { Defect } from '@/domains/interventions';

export const CHECKLIST_ITEMS = [
  {
    id: 'clean_dry',
    title: 'Véhicule propre et sec',
    description: "Aucune trace d'eau ou de graisse sur les zones PPF",
    required: true,
  },
  {
    id: 'temp_ok',
    title: 'Température confirmée 18-25°C',
    description: 'Relevé manuel + capteur atelier',
    required: true,
  },
  {
    id: 'humidity_ok',
    title: 'Humidité 40-60% vérifiée',
    description: "Hygromètre de l'atelier",
  },
  {
    id: 'defects_logged',
    title: 'Défauts pré-existants documentés',
    description: 'Marquer sur le diagramme véhicule',
    required: true,
  },
  {
    id: 'film_ready',
    title: 'Film PPF sélectionné et disponible',
    description: 'Lot : PPF-200µ-2025-09 · Exp. 12/2027',
  },
  {
    id: 'client_informed',
    title: 'Client informé des consignes post-pose',
    description: 'Séchage 48h, pas de lavage HP, pas de cire',
  },
];

export type InspectionDefect = Omit<Defect, 'notes'> & { notes?: string | null };

export type InspectionDraft = {
  checklist?: Record<string, boolean>;
  defects?: InspectionDefect[];
  notes?: string;
  environment?: {
    temp_celsius?: number | null;
    humidity_percent?: number | null;
  };
};
