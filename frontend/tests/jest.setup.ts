import "@testing-library/jest-dom";

const translations: Record<string, string> = {
  // Common actions
  "common.assignToMe": "Assigner à moi",
  "common.edit": "Modifier",
  "common.delete": "Supprimer",
  "common.cancel": "Annuler",
  "common.close": "Fermer",
  "common.save": "Enregistrer",
  "common.submit": "Envoyer",
  "common.confirm": "Confirmer",
  "common.start": "Démarrer",
  "common.complete": "Terminer",
  "common.create": "Créer",
  "common.update": "Mettre à jour",
  "common.loading": "Chargement...",

  // Task-related
  "tasks.unassigned": "Non assigné",
  "tasks.assignToMe": "Assigner à moi",
  "tasks.startTask": "Démarrer la tâche",
  "tasks.completeTask": "Terminer la tâche",
  "tasks.markInvalid": "Marquer comme invalide",
  "tasks.deleteTask": "Supprimer la tâche",
  "tasks.checklist": "Checklist",
  "tasks.photos": "Photos",
  "tasks.history": "Historique",
  "tasks.tabs.checklist": "Checklist",
  "tasks.tabs.photos": "Photos",
  "tasks.tabs.history": "Historique",
  "tasks.deleteConfirm.title": "Êtes-vous sûr de vouloir supprimer cette tâche ?",
  "tasks.deleteConfirm.description": "Cette action est irréversible",
  "tasks.ppfZone": "Zone PPF",
  "tasks.assignedTechnician": "Technicien assigné",
  "tasks.scheduledDate": "Date prévue",
  "tasks.notScheduled": "Non planifié",

  // Completed / Summary
  "completed.pageLabel": "Intervention terminée",
  "completed.checklist": "Checklist",
  "completed.photos": "Photos",
  "completed.stepCompleted": "complété",
  "completed.documented": "documenté",
  "completed.treated": "traité",
  "completed.duration": "Durée",
  "completed.totalDuration": "Durée totale",
  "completed.client": "Client",
  "completed.recipient": "Destinataire",
  "completed.stepDetails.checklist": "Checklist:",
  "completed.stepDetails.surfaceChecklist": "Surface checklist",
  "completed.stepDetails.cutChecklist": "Cut checklist",
  "completed.stepDetails.materialsChecklist": "Matériaux",
  "completed.stepDetails.unrecognized": "Structure non reconnue",
  "completed.stepDetails.viewRawJson": "Voir le JSON brut",
  "completed.steps.preparation.label": "Préparation",
  "completed.editStep": "Modifier",
  "completed.downloadStepData": "Télécharger",
  "completed.actionBar.downloadPdf": "Télécharger le PDF",
  "completed.actionBar.downloadJson": "Télécharger les données JSON",
  "completed.actionBar.print": "Imprimer",
  "completed.actionBar.share": "Partager",
  "completed.actionBar.lastExport": "Dernier export",
  "completed.actionBar.generating": "Génération en cours...",
  "completed.actionBar.details": "Détails",
  "completed.actionBar.tasks": "Tâches",

  // Navigation
  "nav.tasks": "Tâches",

  // Error fallback
  "error.title": "Erreur",
  "error.retry": "Réessayer",
  "error.dismiss": "Ignorer",

  // Users
  "users.createNewUser": "Créer un nouvel utilisateur",
  "users.editUser": "Modifier l'utilisateur",
  "users.email": "Email",
  "users.emailRequired": "L'email est requis",
  "users.invalidEmail": "Format d'email invalide",
  "users.firstName": "Prénom",
  "users.firstNameRequired": "Le prénom est requis",
  "users.lastName": "Nom",
  "users.lastNameRequired": "Le nom est requis",
  "users.role": "Rôle",
  "users.active": "Actif",
  "users.saving": "Enregistrement...",
  "users.passwordRequired": "Le mot de passe est requis",
  "users.passwordMinLength": "Le mot de passe doit faire au moins 6 caractères",
  "users.userCreated": "Utilisateur créé avec succès",
  "users.userUpdated": "Utilisateur mis à jour avec succès",
  "users.notAuthenticated": "Non authentifié",
  "users.saveFailed": "Échec de l'enregistrement",
  "users.roleAdmin": "Administrateur",
  "users.roleSupervisor": "Superviseur",
  "users.roleTechnician": "Technicien",
  "users.roleViewer": "Observateur",

  // Auth
  "auth.password": "Mot de passe",
};

const tMock = (key: string, params?: Record<string, string | number>) => {
  let value = translations[key] || key;
  if (params && typeof value === "string") {
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      value = value.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramValue));
    });
  }
  return value;
};

// Mock shared hooks index
jest.mock("@/shared/hooks", () => ({
  useTranslation: () => ({
    t: tMock,
    locale: "fr",
  }),
  useLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
  useFormLogger: () => ({
    logChange: jest.fn(),
    logSubmit: jest.fn(),
    logError: jest.fn(),
  }),
  useApiLogger: () => ({
    logRequest: jest.fn(),
    logResponse: jest.fn(),
    logError: jest.fn(),
  }),
}));

// Mock useTranslation leaf file
jest.mock("@/shared/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: tMock,
    locale: "fr",
  }),
}));

jest.mock("@/domains/auth", () => ({
  useAuth: () => ({
    user: {
      id: "test-user-1",
      user_id: "test-user-1",
      username: "test-user",
      email: "test@example.com",
      role: "technician",
      token: "test-session-token",
      first_name: "Test",
      last_name: "User",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
    profile: {
      id: "test-user-1",
      email: "test@example.com",
      first_name: "Test",
      last_name: "User",
      role: "technician",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    session: {
      id: "test-user-1",
      user_id: "test-user-1",
      username: "test-user",
      email: "test@example.com",
      role: "technician",
      token: "test-session-token",
      first_name: "Test",
      last_name: "User",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
    loading: false,
    isAuthenticating: false,
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    refreshProfile: jest.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  AuthContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
    Consumer: ({ children }: { children: (value: unknown) => React.ReactNode }) => children({}),
  },
}));
