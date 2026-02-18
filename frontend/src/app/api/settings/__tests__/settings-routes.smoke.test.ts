interface MockResponse {
  status: number;
  json: () => Promise<unknown>;
}

type RouteHandler = (request: Record<string, unknown>) => Promise<MockResponse>;

interface SettingsRouteHandlers {
  getSettings: RouteHandler;
  putSettings: RouteHandler;
  getPreferences: RouteHandler;
  putPreferences: RouteHandler;
  getNotifications: RouteHandler;
  putNotifications: RouteHandler;
  getAccessibility: RouteHandler;
  putAccessibility: RouteHandler;
  getPerformance: RouteHandler;
  putPerformance: RouteHandler;
  getProfile: RouteHandler;
  putProfile: RouteHandler;
  putPassword: RouteHandler;
  postReset: RouteHandler;
  postExport: RouteHandler;
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

jest.mock('@/lib/middleware/auth.middleware', () => ({
  withAuth: (handler: (request: Record<string, unknown>) => Promise<MockResponse>) => {
    return async (request: Record<string, unknown>) =>
      handler({
        ...request,
        user: { id: 'user-1' },
        token: 'token-1',
      });
  },
}));

jest.mock('@/domains/settings/server', () => ({
  settingsService: {
    getUserSettings: jest.fn(),
    updatePreferences: jest.fn(),
    updateNotifications: jest.fn(),
    updateAccessibility: jest.fn(),
    updatePerformance: jest.fn(),
    updateProfile: jest.fn(),
    changePassword: jest.fn(),
    resetSettings: jest.fn(),
    exportUserData: jest.fn(),
  },
}));

const { settingsService } = jest.requireMock('@/domains/settings/server') as {
  settingsService: {
    getUserSettings: jest.Mock;
    updatePreferences: jest.Mock;
    updateNotifications: jest.Mock;
    updateAccessibility: jest.Mock;
    updatePerformance: jest.Mock;
    updateProfile: jest.Mock;
    changePassword: jest.Mock;
    resetSettings: jest.Mock;
    exportUserData: jest.Mock;
  };
};

const baseSettings = {
  preferences: { theme: 'system' },
  notifications: { email_enabled: true },
  accessibility: { high_contrast: false },
  performance: { cache_enabled: true },
  profile: { full_name: 'User One' },
};

const makeJsonRequest = (body: unknown) =>
  ({
    json: jest.fn().mockResolvedValue(body),
  }) as Record<string, unknown>;

let routes: SettingsRouteHandlers;

describe('/api/settings routes smoke', () => {
  beforeAll(async () => {
    const [
      settingsRoute,
      preferencesRoute,
      notificationsRoute,
      accessibilityRoute,
      performanceRoute,
      profileRoute,
      passwordRoute,
      resetRoute,
      exportRoute,
    ] = await Promise.all([
      import('../route'),
      import('../preferences/route'),
      import('../notifications/route'),
      import('../accessibility/route'),
      import('../performance/route'),
      import('../profile/route'),
      import('../password/route'),
      import('../reset/route'),
      import('../export/route'),
    ]);

    routes = {
      getSettings: settingsRoute.GET as unknown as RouteHandler,
      putSettings: settingsRoute.PUT as unknown as RouteHandler,
      getPreferences: preferencesRoute.GET as unknown as RouteHandler,
      putPreferences: preferencesRoute.PUT as unknown as RouteHandler,
      getNotifications: notificationsRoute.GET as unknown as RouteHandler,
      putNotifications: notificationsRoute.PUT as unknown as RouteHandler,
      getAccessibility: accessibilityRoute.GET as unknown as RouteHandler,
      putAccessibility: accessibilityRoute.PUT as unknown as RouteHandler,
      getPerformance: performanceRoute.GET as unknown as RouteHandler,
      putPerformance: performanceRoute.PUT as unknown as RouteHandler,
      getProfile: profileRoute.GET as unknown as RouteHandler,
      putProfile: profileRoute.PUT as unknown as RouteHandler,
      putPassword: passwordRoute.PUT as unknown as RouteHandler,
      postReset: resetRoute.POST as unknown as RouteHandler,
      postExport: exportRoute.POST as unknown as RouteHandler,
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();

    settingsService.getUserSettings.mockResolvedValue({ success: true, data: baseSettings });
    settingsService.updatePreferences.mockResolvedValue({ success: true, data: baseSettings });
    settingsService.updateNotifications.mockResolvedValue({ success: true, data: baseSettings });
    settingsService.updateAccessibility.mockResolvedValue({ success: true, data: baseSettings });
    settingsService.updatePerformance.mockResolvedValue({ success: true, data: baseSettings });
    settingsService.updateProfile.mockResolvedValue({ success: true, data: baseSettings });
    settingsService.changePassword.mockResolvedValue({ success: true });
    settingsService.resetSettings.mockResolvedValue({ success: true, data: baseSettings });
    settingsService.exportUserData.mockResolvedValue({
      success: true,
      data: { user: { id: 'user-1' }, settings: baseSettings },
    });
  });

  it('GET /api/settings returns consistent success shape', async () => {
    const response = await routes.getSettings({});
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      success: true,
      data: {
        settings: baseSettings,
      },
    });
    expect(settingsService.getUserSettings).toHaveBeenCalledWith('user-1', 'token-1');
  });

  it('PUT /api/settings updates provided sections and returns refreshed settings', async () => {
    const response = await routes.putSettings(
      makeJsonRequest({
        preferences: { theme: 'dark' },
        notifications: { email_enabled: false },
        accessibility: { high_contrast: true },
        performance: { cache_enabled: false },
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      success: true,
      data: {
        message: 'Settings updated successfully',
        updates: [
          { section: 'preferences', success: true, error: undefined },
          { section: 'notifications', success: true, error: undefined },
          { section: 'accessibility', success: true, error: undefined },
          { section: 'performance', success: true, error: undefined },
        ],
        settings: baseSettings,
      },
    });
    expect(settingsService.updatePreferences).toHaveBeenCalledWith('user-1', { theme: 'dark' }, 'token-1');
    expect(settingsService.updateNotifications).toHaveBeenCalledWith('user-1', { email_enabled: false }, 'token-1');
    expect(settingsService.updateAccessibility).toHaveBeenCalledWith('user-1', { high_contrast: true }, 'token-1');
    expect(settingsService.updatePerformance).toHaveBeenCalledWith('user-1', { cache_enabled: false }, 'token-1');
  });

  it('PUT /api/settings/password returns error shape on service failure', async () => {
    settingsService.changePassword.mockResolvedValueOnce({
      success: false,
      error: 'invalid current password',
    });

    const response = await routes.putPassword(
      makeJsonRequest({
        current_password: 'WrongPass!23',
        new_password: 'StrongPass!234',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      success: false,
      error: 'invalid current password',
    });
  });

  it('GET/PUT /api/settings/preferences use service and response contract', async () => {
    const getResponse = await routes.getPreferences({});
    const getPayload = await getResponse.json();
    expect(getResponse.status).toBe(200);
    expect(getPayload).toEqual({
      success: true,
      data: {
        preferences: baseSettings.preferences,
      },
    });

    const putResponse = await routes.putPreferences(makeJsonRequest({ theme: 'light' }));
    const putPayload = await putResponse.json();
    expect(putResponse.status).toBe(200);
    expect(putPayload).toEqual({
      success: true,
      data: {
        message: 'Preferences updated successfully',
        preferences: baseSettings.preferences,
      },
    });
  });

  it('GET/PUT /api/settings/notifications use service and response contract', async () => {
    const getResponse = await routes.getNotifications({});
    const getPayload = await getResponse.json();
    expect(getResponse.status).toBe(200);
    expect(getPayload).toEqual({
      success: true,
      data: {
        notifications: baseSettings.notifications,
      },
    });

    const putResponse = await routes.putNotifications(makeJsonRequest({ email_enabled: false }));
    const putPayload = await putResponse.json();
    expect(putResponse.status).toBe(200);
    expect(putPayload).toEqual({
      success: true,
      data: {
        message: 'Notification settings updated successfully',
        notifications: baseSettings.notifications,
      },
    });
  });

  it('GET/PUT /api/settings/accessibility use service and response contract', async () => {
    const getResponse = await routes.getAccessibility({});
    const getPayload = await getResponse.json();
    expect(getResponse.status).toBe(200);
    expect(getPayload).toEqual({
      success: true,
      data: {
        accessibility: baseSettings.accessibility,
      },
    });

    const putResponse = await routes.putAccessibility(makeJsonRequest({ high_contrast: true }));
    const putPayload = await putResponse.json();
    expect(putResponse.status).toBe(200);
    expect(putPayload).toEqual({
      success: true,
      data: {
        message: 'Accessibility settings updated successfully',
        accessibility: baseSettings.accessibility,
      },
    });
  });

  it('GET/PUT /api/settings/performance use service and response contract', async () => {
    const getResponse = await routes.getPerformance({});
    const getPayload = await getResponse.json();
    expect(getResponse.status).toBe(200);
    expect(getPayload).toEqual({
      success: true,
      data: {
        performance: baseSettings.performance,
      },
    });

    const putResponse = await routes.putPerformance(makeJsonRequest({ cache_enabled: false }));
    const putPayload = await putResponse.json();
    expect(putResponse.status).toBe(200);
    expect(putPayload).toEqual({
      success: true,
      data: {
        message: 'Performance settings updated successfully',
        performance: baseSettings.performance,
      },
    });
  });

  it('GET/PUT /api/settings/profile use service and response contract', async () => {
    const getResponse = await routes.getProfile({});
    const getPayload = await getResponse.json();
    expect(getResponse.status).toBe(200);
    expect(getPayload).toEqual({
      success: true,
      data: {
        profile: baseSettings.profile,
      },
    });

    const putResponse = await routes.putProfile(makeJsonRequest({ full_name: 'New Name' }));
    const putPayload = await putResponse.json();
    expect(putResponse.status).toBe(200);
    expect(putPayload).toEqual({
      success: true,
      data: {
        message: 'Profile updated successfully',
        profile: baseSettings.profile,
      },
    });
  });

  it('POST /api/settings/reset and POST /api/settings/export return success shape', async () => {
    const resetResponse = await routes.postReset({});
    const resetPayload = await resetResponse.json();
    expect(resetResponse.status).toBe(200);
    expect(resetPayload).toEqual({
      success: true,
      data: {
        message: 'Settings reset to defaults successfully',
        settings: baseSettings,
      },
    });

    const exportResponse = await routes.postExport({});
    const exportPayload = await exportResponse.json();
    expect(exportResponse.status).toBe(200);
    expect(exportPayload).toEqual({
      success: true,
      data: {
        export: { user: { id: 'user-1' }, settings: baseSettings },
      },
    });
  });
});

