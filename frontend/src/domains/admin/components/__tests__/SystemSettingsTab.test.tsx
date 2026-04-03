import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { settingsOperations } from "@/shared/utils";
import { rulesIpc } from "@/domains/rules/ipc/rules.ipc";
import { SystemSettingsTab } from "../SystemSettingsTab";
import { MonitoringTab } from "../MonitoringTab";
import { BusinessRulesTab } from "../BusinessRulesTab";

jest.mock("@/shared/hooks/useAuth", () => ({
  useAuth: () => ({ session: { token: "test-token" } }),
}));

jest.mock("@/domains/rules/ipc/rules.ipc", () => ({
  rulesIpc: {
    list: jest.fn(),
    delete: jest.fn(),
    activate: jest.fn(),
    disable: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    test: jest.fn(),
  },
}));

jest.mock("@/shared/utils", () => ({
  settingsOperations: {
    getAppSettings: jest.fn(),
    updateGeneralSettings: jest.fn(),
    updateBusinessRules: jest.fn(),
  },
  LogDomain: {
    AUTH: "AUTH",
    TASK: "TASK",
    CLIENT: "CLIENT",
    PHOTO: "PHOTO",
    SYNC: "SYNC",
    UI: "UI",
    API: "API",
    SYSTEM: "SYSTEM",
    USER: "USER",
    PERFORMANCE: "PERFORMANCE",
    SECURITY: "SECURITY",
  },
}));

jest.mock("@/domains/admin/hooks/useSystemHealth", () => ({
  useSystemHealth: () => ({
    systemStatus: "healthy",
    statusDetails: {
      status: "healthy",
      components: {
        database: {
          status: "healthy",
          message: "OK",
          lastChecked: new Date().toISOString(),
        },
      },
      timestamp: new Date().toISOString(),
    },
    loading: false,
    refreshing: false,
    refresh: jest.fn(),
  }),
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: ({
    open,
    title,
    description,
    onConfirm,
  }: {
    open: boolean;
    title: string;
    description?: string;
    onConfirm: () => void;
  }) =>
    open ? (
      <div data-testid="confirm-dialog">
        <div>{title}</div>
        <div>{description}</div>
        <button type="button" onClick={onConfirm}>
          Confirmer
        </button>
      </div>
    ) : null,
}));

jest.mock("@/shared/hooks/useLogger", () => ({
  useLogger: () => ({
    logDebug: jest.fn(),
    logInfo: jest.fn(),
    logWarn: jest.fn(),
    logError: jest.fn(),
    logFatal: jest.fn(),
    logPerformance: () => jest.fn(),
    logUserAction: jest.fn(),
    logApiCall: jest.fn(),
    logErrorWithContext: jest.fn(),
    logStateChange: jest.fn(),
    logPropsChange: jest.fn(),
  }),
  useFormLogger: () => ({
    logFormEvent: jest.fn(),
    logFormValidation: jest.fn(),
    logFormSubmit: jest.fn(),
  }),
}));

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
  },
}));

const mockGetAppSettings = settingsOperations.getAppSettings as jest.Mock;
const mockUpdateGeneralSettings =
  settingsOperations.updateGeneralSettings as jest.Mock;
const mockUpdateBusinessRules =
  settingsOperations.updateBusinessRules as jest.Mock;
const mockRulesList = rulesIpc.list as jest.Mock;
const mockRulesDelete = rulesIpc.delete as jest.Mock;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return Wrapper;
};

describe("Configuration tabs regressions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAppSettings.mockResolvedValue({ general: {} });
    mockUpdateGeneralSettings.mockResolvedValue({});
    mockUpdateBusinessRules.mockResolvedValue({});
    mockRulesList.mockResolvedValue([]);
    mockRulesDelete.mockResolvedValue(undefined);
  });

  it("renders business hours schedule entries", async () => {
    render(<SystemSettingsTab />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/Paramètres Système/i)).toBeInTheDocument();
    });

    const businessHoursTab = screen.getByRole("tab", {
      name: /Heures d'ouverture/i,
    });
    const user = userEvent.setup();
    await user.click(businessHoursTab);

    await waitFor(() => {
      expect(screen.getByText("monday")).toBeInTheDocument();
    });
    expect(screen.getAllByText("08:00 - 18:00").length).toBeGreaterThan(0);
  });

  it("does not render removed static monitoring placeholders", async () => {
    render(<MonitoringTab />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/État du Système/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/Temps de réponse API/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Alertes Récentes/i)).not.toBeInTheDocument();
  });

  it("opens confirm dialog before deleting a business rule", async () => {
    mockRulesList.mockResolvedValue([
      {
        id: "rule-1",
        name: "Règle Test",
        description: "Description",
        template_key: "task-assignment",
        trigger: "task_created",
        mode: "reactive",
        status: "active",
        conditions: {},
        actions: [{ type: "queue_integration", event_name: "rule.task_assignment", integration_ids: null }],
        created_at: Date.now(),
        updated_at: Date.now(),
      },
    ]);

    render(<BusinessRulesTab />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/Règles Métier/i)).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(
      await screen.findByLabelText(/Supprimer la règle Règle Test/i),
    );

    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("confirm-dialog")).toHaveTextContent(
      "Supprimer la règle",
    );

    await user.click(screen.getByRole("button", { name: /Confirmer/i }));

    await waitFor(() => {
      expect(mockRulesDelete).toHaveBeenCalledWith("rule-1");
    });
  });
});
