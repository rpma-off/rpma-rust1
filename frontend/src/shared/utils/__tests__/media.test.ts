import { resolveLocalImageUrl, shouldUseUnoptimizedImage } from '@/shared/utils/media';

describe('media utils', () => {
  const originalTauriInternals = (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;

  afterEach(() => {
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = originalTauriInternals;
  });

  it('returns remote URLs unchanged', () => {
    expect(resolveLocalImageUrl('https://example.com/image.jpg')).toBe('https://example.com/image.jpg');
    expect(resolveLocalImageUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
  });

  it('converts Windows file paths via Tauri convertFileSrc', () => {
    const convertFileSrc = jest.fn((path: string, protocol?: string) => `${protocol}://${path}`);
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = { convertFileSrc };

    const result = resolveLocalImageUrl('C:\\Users\\test\\photo.png');

    expect(convertFileSrc).toHaveBeenCalledWith('C:/Users/test/photo.png', 'asset');
    expect(result).toBe('asset://C:/Users/test/photo.png');
  });

  it('converts file:// URLs via Tauri convertFileSrc', () => {
    const convertFileSrc = jest.fn((path: string, protocol?: string) => `${protocol}://${path}`);
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = { convertFileSrc };

    const result = resolveLocalImageUrl('file:///C:/Users/test/photo%20name.png');

    expect(convertFileSrc).toHaveBeenCalledWith('C:/Users/test/photo name.png', 'asset');
    expect(result).toBe('asset://C:/Users/test/photo name.png');
  });

  it('returns a safe fallback instead of file:// when Tauri is unavailable', () => {
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = undefined;

    const result = resolveLocalImageUrl('file:///C:/Users/test/photo.png');

    expect(result.startsWith('data:image/')).toBe(true);
    expect(result.startsWith('file://')).toBe(false);
  });

  it('marks asset and data URLs as unoptimized', () => {
    expect(shouldUseUnoptimizedImage('asset://C:/photo.png')).toBe(true);
    expect(shouldUseUnoptimizedImage('https://asset.localhost/_tauri/foo')).toBe(true);
    expect(shouldUseUnoptimizedImage('https://example.com/photo.png')).toBe(false);
  });
});
