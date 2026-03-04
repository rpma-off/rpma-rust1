import { renderHook, act, waitFor } from '@testing-library/react';
import { useSettings, invalidateSettingsCache } from '../api/useSettings';
import { DEFAULT_USER_SETTINGS } from '../services/defaults';

// ── Mocks ───────────────────────────────────────────────────────────

const mockGetUserSettings = jest.fn();

jest.mock('@/domains/auth', () => ({
  useAuth: () => ({ user: { token: 'test-token-123' } }),
}));

jest.mock('../server', () => ({
  settingsService: {
    getUserSettings: (...args: unknown[]) => mockGetUserSettings(...args),
  },
}));

// ── Helpers ─────────────────────────────────────────────────────────

const CACHE_KEY = 'rpma:settings_cache';

function seedCache(data: typeof DEFAULT_USER_SETTINGS, ts = Date.now()) {
  sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts }));
}

// ── Tests ───────────────────────────────────────────────────────────

beforeEach(() => {
  sessionStorage.clear();
  mockGetUserSettings.mockReset();
});

describe('useSettings – cache behaviour', () => {
  it('returns cached data immediately when cache is fresh', () => {
    seedCache(DEFAULT_USER_SETTINGS);
    mockGetUserSettings.mockResolvedValue({ success: true, data: DEFAULT_USER_SETTINGS });

    const { result } = renderHook(() => useSettings());

    // Cached value is available synchronously on first render
    expect(result.current.settings).toEqual(DEFAULT_USER_SETTINGS);
    expect(result.current.loading).toBe(false);
  });

  it('fetches from backend and writes cache on success', async () => {
    const serverSettings = {
      ...DEFAULT_USER_SETTINGS,
      preferences: { ...DEFAULT_USER_SETTINGS.preferences, language: 'en' },
    };
    mockGetUserSettings.mockResolvedValue({ success: true, data: serverSettings });

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.settings).toEqual(serverSettings);

    // Cache should now contain the fetched data
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY)!);
    expect(cached.data.preferences.language).toBe('en');
  });

  it('reports error when backend returns failure', async () => {
    mockGetUserSettings.mockResolvedValue({ success: false, error: 'DB down' });

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('DB down');
    expect(result.current.settings).toBeNull();
  });

  it('invalidateSettingsCache removes the cache entry', () => {
    seedCache(DEFAULT_USER_SETTINGS);
    expect(sessionStorage.getItem(CACHE_KEY)).not.toBeNull();

    invalidateSettingsCache();

    expect(sessionStorage.getItem(CACHE_KEY)).toBeNull();
  });

  it('ignores expired cache entries', () => {
    // Seed with a timestamp older than 30 s
    seedCache(DEFAULT_USER_SETTINGS, Date.now() - 60_000);
    mockGetUserSettings.mockResolvedValue({ success: true, data: DEFAULT_USER_SETTINGS });

    const { result } = renderHook(() => useSettings());

    // Expired cache should not be returned; loading starts
    expect(result.current.loading).toBe(true);
  });

  it('refetch forces a fresh backend call', async () => {
    mockGetUserSettings.mockResolvedValue({ success: true, data: DEFAULT_USER_SETTINGS });

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // First call from mount
    expect(mockGetUserSettings).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockGetUserSettings).toHaveBeenCalledTimes(2);
  });
});
