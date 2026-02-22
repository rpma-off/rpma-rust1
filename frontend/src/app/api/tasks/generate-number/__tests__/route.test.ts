interface MockResponse {
  status: number;
  json: () => Promise<unknown>;
}

jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: ResponseInit) =>
      ({
        status: init?.status ?? 200,
        json: async () => data,
      }) as MockResponse,
  },
}));

jest.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('/api/tasks/generate-number route', () => {
  it('GET returns a task number in expected format', async () => {
    const { GET } = await import('../route');
    const response = await GET();
    const payload = (await response.json()) as { success: boolean; task_number: string };

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.task_number).toMatch(/^TASK-\d+-\d{3}$/);
  });

  it('POST validates task number format', async () => {
    const { POST } = await import('../route');
    const response = await POST({
      json: jest.fn().mockResolvedValue({ task_number: 'TASK-123456789-123' }),
    } as unknown as Request);
    const payload = (await response.json()) as { success: boolean; is_valid: boolean };

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.is_valid).toBe(true);
  });
});
