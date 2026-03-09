import "@testing-library/jest-dom";

// Mock useTranslation to return English for tests
jest.mock("@/shared/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      // English translations for test compatibility
      const translations: Record<string, string> = {
        // Common actions
        "common.assignToMe": "Assign to Me",
        "common.edit": "Edit",
        "common.delete": "Delete",
        "common.cancel": "Cancel",
        "common.close": "Close",
        "common.save": "Save",
        "common.submit": "Submit",
        "common.confirm": "Confirm",
        "common.start": "Start",
        "common.complete": "Complete",
        "common.loading": "Loading...",

        // Task-related
        "tasks.unassigned": "Unassigned",
        "tasks.assignToMe": "Assign to Me",
        "tasks.startTask": "Start Task",
        "tasks.completeTask": "Complete Task",
        "tasks.markInvalid": "Mark as Invalid",
        "tasks.deleteTask": "Delete Task",
        "tasks.checklist": "Checklist",
        "tasks.photos": "Photos",
        "tasks.history": "History",
        "tasks.tabs.checklist": "Checklist",
        "tasks.tabs.photos": "Photos",
        "tasks.tabs.history": "History",
        "tasks.deleteConfirm.title": "Are you sure you want to delete this task?",
        "tasks.deleteConfirm.description": "This action cannot be undone",

        // Navigation
        "nav.tasks": "Tasks",

        // Error fallback
        "error.title": "Error",
        "error.retry": "Retry",
        "error.dismiss": "Dismiss",
      };

      let value = translations[key] || key;

      // Replace parameters
      if (params && typeof value === "string") {
        Object.entries(params).forEach(([paramKey, paramValue]) => {
          value = value.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramValue));
        });
      }

      return value;
    },
    locale: "en",
  }),
  default: () => ({
    t: (key: string) => key,
    locale: "en",
  }),
}));

jest.mock("@/domains/auth", () => ({
  useAuth: () => ({
    user: {
      id: "test-user-1",
      email: "test@example.com",
      role: "technician",
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
      email: "test@example.com",
      role: "technician",
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
