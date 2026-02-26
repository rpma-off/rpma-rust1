const FALLBACK_IMAGE_DATA_URI =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

type TauriInternals = {
  convertFileSrc?: (filePath: string, protocol?: string) => string;
};

function getTauriInternals(): TauriInternals | null {
  if (typeof window === 'undefined') return null;
  const internals = (window as Window & { __TAURI_INTERNALS__?: TauriInternals }).__TAURI_INTERNALS__;
  return internals ?? null;
}

function isLikelyLocalFilePath(value: string): boolean {
  return (
    /^[A-Za-z]:[\\/]/.test(value) ||
    value.startsWith('/') ||
    value.startsWith('\\\\') ||
    value.startsWith('file://')
  );
}

function normalizeFilePath(value: string): string {
  if (value.startsWith('file://')) {
    try {
      const url = new URL(value);
      return decodeURIComponent(url.pathname).replace(/^\/([A-Za-z]:\/)/, '$1');
    } catch {
      return value.replace(/^file:\/+/, '');
    }
  }

  return value;
}

export function resolveLocalImageUrl(input?: string | null): string {
  const value = (input ?? '').trim();
  if (!value) return FALLBACK_IMAGE_DATA_URI;

  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:') ||
    value.startsWith('blob:') ||
    value.startsWith('asset:')
  ) {
    return value;
  }

  if (!isLikelyLocalFilePath(value)) {
    return value;
  }

  const normalizedPath = normalizeFilePath(value).replace(/\\/g, '/');
  const tauri = getTauriInternals();
  if (tauri?.convertFileSrc) {
    try {
      return tauri.convertFileSrc(normalizedPath, 'asset');
    } catch (error) {
      console.warn('Failed to convert local image path with Tauri convertFileSrc:', error);
    }
  }

  return FALLBACK_IMAGE_DATA_URI;
}

export function shouldUseUnoptimizedImage(url?: string | null): boolean {
  const value = (url ?? '').trim();
  if (!value) return true;

  return (
    value.startsWith('data:') ||
    value.startsWith('blob:') ||
    value.startsWith('asset:') ||
    value.startsWith('https://asset.localhost')
  );
}

export const LOCAL_IMAGE_FALLBACK_SRC = FALLBACK_IMAGE_DATA_URI;
