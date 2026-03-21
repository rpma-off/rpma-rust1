export const SURFACE_CHECKLIST = [
  {
    id: 'wash',
    title: 'Lavage complet du véhicule',
    description: 'Nettoyage pH neutre, rinçage sans traces',
    required: true,
  },
  {
    id: 'clay_bar',
    title: 'Décontamination (clay bar)',
    description: 'Éliminer particules et résidus incrustés',
    required: true,
  },
  {
    id: 'degrease',
    title: 'Dégraissage des zones PPF',
    description: 'IPA 70% sur capot, ailes, pare-choc',
    required: true,
  },
  {
    id: 'masking',
    title: 'Masquage zones sensibles',
    description: 'Joints, poignées, capteurs',
    required: true,
  },
  {
    id: 'drying',
    title: 'Séchage complet',
    description: 'Microfibre + air comprimé',
    required: true,
  },
  {
    id: 'final_check',
    title: 'Contrôle surface',
    description: 'Aucune poussière ou résidu',
    required: true,
  },
];

export const CUT_CHECKLIST = [
  { id: 'hood', title: 'Capot prédécoupé', description: 'Film 200µ' },
  { id: 'left_fender', title: 'Aile avant G', description: 'Film 150µ' },
  { id: 'right_fender', title: 'Aile avant D', description: 'Film 150µ' },
  { id: 'bumper', title: 'Pare-choc avant', description: 'Film 150µ' },
  { id: 'mirrors', title: 'Rétroviseurs', description: 'Film 100µ' },
  { id: 'sills', title: 'Seuils de porte', description: 'Film 150µ' },
];

export const MATERIALS_CHECKLIST = [
  { id: 'ppf_200', title: 'Film PPF 200µ (capot)' },
  { id: 'ppf_150', title: 'Film PPF 150µ (ailes/pare-choc)' },
  { id: 'ppf_100', title: 'Film PPF 100µ (rétros)' },
  { id: 'solution', title: "Solution d'application 1L" },
  { id: 'squeegee', title: 'Squeegee pro (dur)' },
  { id: 'heatgun', title: 'Pistolet chaleur' },
  { id: 'knife', title: 'Cutter précision' },
  { id: 'microfiber', title: 'Microfibres (x10)' },
];

export const CUT_ROWS = [
  { id: 'hood', label: 'Capot', surface: '2.4 m²', film: '200µ' },
  { id: 'left_fender', label: 'Aile G', surface: '1.2 m²', film: '150µ' },
  { id: 'right_fender', label: 'Aile D', surface: '1.2 m²', film: '150µ' },
  { id: 'bumper', label: 'Pare-choc', surface: '0.9 m²', film: '150µ' },
  { id: 'mirrors', label: 'Rétros', surface: '0.3 m²', film: '100µ' },
  { id: 'sills', label: 'Seuils', surface: '1.0 m²', film: '150µ' },
];

export type PreparationDraft = {
  surfaceChecklist?: Record<string, boolean>;
  cutChecklist?: Record<string, boolean>;
  materialsChecklist?: Record<string, boolean>;
  notes?: string;
};
