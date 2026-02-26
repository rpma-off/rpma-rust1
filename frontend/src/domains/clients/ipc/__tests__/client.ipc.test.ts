import { clientIpc } from '../client.ipc';

jest.mock('@/lib/ipc/core', () => ({
  safeInvoke: jest.fn(),
  extractAndValidate: jest.fn(),
  cachedInvoke: jest.fn(),
  invalidatePattern: jest.fn(),
}));

jest.mock('@/lib/ipc/commands', () => ({
  IPC_COMMANDS: {
    CLIENT_CRUD: 'client_crud',
  },
}));

jest.mock('@/lib/validation/backend-type-guards', () => ({
  validateClient: jest.fn((data) => data),
  validateClientListResponse: jest.fn(() => true),
}));

const { safeInvoke, extractAndValidate } = jest.requireMock('@/lib/ipc/core') as {
  safeInvoke: jest.Mock;
  extractAndValidate: jest.Mock;
};

const { validateClientListResponse } = jest.requireMock('@/lib/validation/backend-type-guards') as {
  validateClientListResponse: jest.Mock;
};

describe('domains/clients/clientIpc tagged payload unwrapping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    safeInvoke.mockResolvedValue({});
    extractAndValidate.mockImplementation((value) => value);
    validateClientListResponse.mockReturnValue(true);
  });

  it('unwraps tagged SearchResults payload to raw Client[]', async () => {
    const clients = [{ id: 'c1', name: 'Acme' }];
    extractAndValidate.mockReturnValue({
      type: 'SearchResults',
      data: clients,
    });

    const result = await clientIpc.search('ac', 20, 'token');

    expect(result).toEqual(clients);
    expect(Array.isArray(result)).toBe(true);
  });

  it('unwraps tagged List payload to ClientListResponse', async () => {
    const listResponse = {
      data: [{ id: 'c1', name: 'Acme' }],
      pagination: { page: 1, limit: 20, total: 1, total_pages: 1 },
      statistics: null,
    };
    extractAndValidate.mockReturnValue({
      type: 'List',
      data: listResponse,
    });

    const result = await clientIpc.list({ page: 1 }, 'token');

    expect(validateClientListResponse).toHaveBeenCalledWith(listResponse);
    expect(result).toEqual(listResponse);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('unwraps tagged ListWithTasks payload to raw ClientWithTasks[]', async () => {
    const clientsWithTasks = [{ id: 'c1', name: 'Acme', tasks: [] }];
    extractAndValidate.mockReturnValue({
      type: 'ListWithTasks',
      data: clientsWithTasks,
    });

    const result = await clientIpc.listWithTasks({ page: 1 }, 5, 'token');

    expect(result).toEqual(clientsWithTasks);
    expect(Array.isArray(result)).toBe(true);
  });

  it('throws on invalid tagged payload type for search', async () => {
    extractAndValidate.mockReturnValue({
      type: 'List',
      data: [],
    });

    await expect(clientIpc.search('x', 10, 'token')).rejects.toThrow(
      'Invalid client search response type: expected SearchResults, received List'
    );
  });

  it('throws on missing array payload for listWithTasks', async () => {
    extractAndValidate.mockReturnValue({
      type: 'ListWithTasks',
      data: { not: 'an-array' },
    });

    await expect(clientIpc.listWithTasks({}, 5, 'token')).rejects.toThrow(
      'Invalid client list with tasks response: expected array payload'
    );
  });
});
