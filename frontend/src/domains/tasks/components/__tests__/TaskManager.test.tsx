import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ipcClient } from "@/lib/ipc";
import { taskIpc } from "../../ipc/task.ipc";
import TaskManager from "../TaskManager";

// Create a new QueryClient instance for each test
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

jest.mock("@/domains/auth", () => ({
  useAuth: () => ({
    user: { id: "user-123", token: "mock-token" },
  }),
}));

jest.mock("@/lib/ipc", () => ({
  ipcClient: {
    clients: {
      list: jest.fn(),
    },
  },
}));

jest.mock("../../ipc/task.ipc", () => ({
  taskIpc: {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("@/lib/utils/error-handler", () => ({
  handleError: jest.fn(),
}));

jest.mock("@/shared/ui", () => ({
  DesktopForm: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DesktopTable: ({
    data,
    columns,
  }: {
    data: Array<Record<string, unknown>>;
    columns: Array<{
      key: string;
      render?: (
        value: unknown,
        item: Record<string, unknown>,
      ) => React.ReactNode;
    }>;
  }) => (
    <div data-testid="desktop-table">
      {data.map((item, index) => (
        <div key={String(item.id ?? index)} data-testid="task-row">
          {columns.map((column) => (
            <div key={column.key}>
              {column.render
                ? column.render(item[column.key], item)
                : String(item[column.key] ?? "")}
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
  EntitySyncIndicator: ({ entityId }: { entityId: string }) => (
    <div data-testid={`sync-${entityId}`} />
  ),
}));

const mockTasksList = taskIpc.list as jest.MockedFunction<
  typeof taskIpc.list
>;
const mockTasksCreate = taskIpc.create as jest.MockedFunction<
  typeof taskIpc.create
>;
const mockTasksDelete = taskIpc.delete as jest.MockedFunction<
  typeof taskIpc.delete
>;
const mockClientsList = ipcClient.clients.list as jest.MockedFunction<
  typeof ipcClient.clients.list
>;

describe("TaskManager", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = createTestQueryClient();

    mockTasksList.mockResolvedValue({
      data: [
        {
          id: "task-1",
          title: "Test Task",
          description: "Description",
          client_id: "client-1",
          priority: "high",
          status: "draft",
          scheduled_date: null,
          created_at: "2026-03-09T00:00:00.000Z",
          updated_at: "2026-03-09T00:00:00.000Z",
        },
      ],
      pagination: {
        page: 1,
        limit: 100,
        total: 1,
        has_next: false,
        has_prev: false,
      },
    } as never);
    mockClientsList.mockResolvedValue({
      data: [
        {
          id: "client-1",
          name: "Client test",
          created_at: "2026-03-09T00:00:00.000Z",
          updated_at: "2026-03-09T00:00:00.000Z",
        },
      ],
      pagination: {
        page: 1,
        limit: 100,
        total: 1,
        has_next: false,
        has_prev: false,
      },
    } as never);
    mockTasksCreate.mockResolvedValue({ id: "task-2" } as never);
    mockTasksDelete.mockResolvedValue(undefined as never);
  });

  it("loads tasks and clients on mount", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TaskManager />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(mockTasksList).toHaveBeenCalledWith({
        page: 1,
        limit: 100,
      });
      expect(mockClientsList).toHaveBeenCalledWith({
        page: 1,
        limit: 100,
        sort_by: "created_at",
        sort_order: "desc",
      });
    });

    expect(await screen.findByText("Test Task")).toBeInTheDocument();
    expect(screen.getByTestId("desktop-table")).toBeInTheDocument();
  });

  it("opens the create form when clicking the add button", async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={queryClient}>
        <TaskManager />
      </QueryClientProvider>
    );

    const addButton = await screen.findByRole("button", {
      name: /nouvelle tâche/i,
    });
    await user.click(addButton);

    expect(screen.getAllByText(/nouvelle tâche/i).length).toBeGreaterThan(0);
  });

  it("calls delete when confirming removal", async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={queryClient}>
        <TaskManager />
      </QueryClientProvider>
    );

    await screen.findByText("Test Task");
    const deleteButton = await screen.findByRole("button", {
      name: /supprimer/i,
    });
    await user.click(deleteButton);

    // The ConfirmDialog should now be open — click the confirm button inside it
    const confirmButton = await screen.findByRole("button", {
      name: /supprimer/i,
    });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockTasksDelete).toHaveBeenCalledWith("task-1");
    });
  });
});
