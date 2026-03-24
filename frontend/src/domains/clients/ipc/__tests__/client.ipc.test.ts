import { clientIpc } from "../client.ipc";

jest.mock("@/lib/ipc/core", () => ({
  safeInvoke: jest.fn(),
  extractAndValidate: jest.fn(),
  cachedInvoke: jest.fn(),
  invalidatePattern: jest.fn(),
}));

jest.mock("@/lib/ipc/commands", () => ({
  IPC_COMMANDS: {
    CLIENT_CRUD: "client_crud",
    CLIENT_CREATE: "client_create",
    CLIENT_GET: "client_get",
    CLIENT_GET_WITH_TASKS: "client_get_with_tasks",
    CLIENT_UPDATE: "client_update",
    CLIENT_DELETE: "client_delete",
    CLIENT_LIST: "client_list",
    CLIENT_LIST_WITH_TASKS: "client_list_with_tasks",
    CLIENT_SEARCH: "client_search",
    CLIENT_GET_STATS: "client_get_stats",
  },
}));

jest.mock("@/lib/validation/backend-type-guards", () => ({
  validateClient: jest.fn((data) => data),
  validateClientListResponse: jest.fn(() => true),
}));

jest.mock("@/shared/contracts/session", () => ({
  requireSessionToken: jest.fn().mockResolvedValue("test-session-token"),
  getSessionToken: jest.fn().mockResolvedValue("test-session-token"),
}));

const { safeInvoke, extractAndValidate } = jest.requireMock(
  "@/lib/ipc/core",
) as {
  safeInvoke: jest.Mock;
  extractAndValidate: jest.Mock;
};

const { validateClientListResponse } = jest.requireMock(
  "@/lib/validation/backend-type-guards",
) as {
  validateClientListResponse: jest.Mock;
};

describe("domains/clients/clientIpc individual commands", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    safeInvoke.mockResolvedValue({});
    extractAndValidate.mockImplementation((value) => value);
    validateClientListResponse.mockReturnValue(true);
  });

  it("search returns Client[] from direct array response", async () => {
    const clients = [{ id: "c1", name: "Acme" }];
    extractAndValidate.mockReturnValue(clients);

    const result = await clientIpc.search("ac", 20);

    expect(safeInvoke).toHaveBeenCalledWith("client_search", {
      query: "ac",
      limit: 20,
    });
    expect(result).toEqual(clients);
    expect(Array.isArray(result)).toBe(true);
  });

  it("list returns ClientListResponse directly", async () => {
    const listResponse = {
      data: [{ id: "c1", name: "Acme" }],
      pagination: { page: 1, limit: 20, total: 1, total_pages: 1 },
      statistics: null,
    };
    safeInvoke.mockResolvedValue(listResponse);

    const result = await clientIpc.list({ page: 1 });

    expect(safeInvoke).toHaveBeenCalledWith("client_list", {
      filters: {
        pagination: {
          page: 1,
          page_size: 20,
          sort_by: "created_at",
          sort_order: "desc",
        },
        search: null,
        customer_type: null,
      },
    });
    expect(validateClientListResponse).toHaveBeenCalledWith(listResponse);
    expect(result).toEqual(listResponse);
  });

  it("listWithTasks returns ClientWithTasks[] from direct array response", async () => {
    const clientsWithTasks = [{ id: "c1", name: "Acme", tasks: [] }];
    extractAndValidate.mockReturnValue(clientsWithTasks);

    const result = await clientIpc.listWithTasks({ page: 1 }, 5);

    expect(safeInvoke).toHaveBeenCalledWith("client_list_with_tasks", {
      filters: {
        pagination: {
          page: 1,
          page_size: 20,
          sort_by: "created_at",
          sort_order: "desc",
        },
        search: null,
        customer_type: null,
      },
      limit_tasks: 5,
    });
    expect(result).toEqual(clientsWithTasks);
    expect(Array.isArray(result)).toBe(true);
  });

  it("search throws on non-array response", async () => {
    extractAndValidate.mockReturnValue({});

    await expect(clientIpc.search("x", 10)).rejects.toThrow(
      "Invalid client search response: expected array payload",
    );
  });
});
