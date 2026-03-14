import '@testing-library/jest-dom';
import { webcrypto } from 'crypto';
import { TextDecoder, TextEncoder } from 'util';
import * as React from 'react';

// Web crypto polyfill for tests
if (typeof global.crypto === 'undefined') {
  global.crypto = webcrypto;
}

// TextEncoder/TextDecoder polyfill for tests
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}
// Mock Tauri APIs
jest.mock('@tauri-apps/api', () => ({
  invoke: jest.fn(),
  listen: jest.fn(),
  emit: jest.fn(),
}));

// Global mock for useAuth — components import from @/shared/hooks/useAuth
jest.mock('@/shared/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: {
      id: 'test-user',
      user_id: 'test-user',
      username: 'testuser',
      email: 'test@example.com',
      role: 'admin' as const,
      token: 'mock-token',
      refresh_token: null,
      expires_at: new Date(Date.now() + 3600000).toISOString(),
      last_activity: new Date().toISOString(),
      created_at: new Date().toISOString(),
      device_info: null,
      ip_address: null,
      user_agent: null,
      location: null,
      two_factor_verified: false,
      session_timeout_minutes: null,
    },
    profile: null,
    session: null,
    loading: false,
    isAuthenticating: false,
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    refreshProfile: jest.fn(),
  })),
}));

Object.defineProperty(window, '__TAURI__', {
  value: { invoke: jest.fn().mockResolvedValue(null) },
  writable: true,
});

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
  useParams: () => ({}),
}));

// Global test utilities
global.ResizeObserver = class ResizeObserver {
  observe() {}
  disconnect() {}
  unobserve() {}
};

// Mock IntersectionObserver
class IntersectionObserverMock implements IntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin = '';
  readonly thresholds: ReadonlyArray<number> = [];
  private readonly callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }

  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

global.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver;

// Pointer event polyfills for Radix UI components
if (!HTMLElement.prototype.hasPointerCapture) {
  HTMLElement.prototype.hasPointerCapture = () => false;
}
if (!HTMLElement.prototype.setPointerCapture) {
  HTMLElement.prototype.setPointerCapture = () => {};
}
if (!HTMLElement.prototype.releasePointerCapture) {
  HTMLElement.prototype.releasePointerCapture = () => {};
}
if (!HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = () => {};
}

// Simplified Select mock for tests (avoids Radix Select DOM requirements)
jest.mock('@/components/ui/select', () => {
  const SelectContext = React.createContext({ onValueChange: (_value: string) => {} });

  const Select = ({ children, onValueChange }: { children: React.ReactNode; onValueChange?: (value: string) => void }) =>
    React.createElement(
      SelectContext.Provider,
      { value: { onValueChange: onValueChange || (() => {}) } },
      React.createElement('div', null, children)
    );

  const SelectTrigger = ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => React.createElement('button', { type: 'button', ...props }, children);

  const SelectValue = ({
    placeholder,
    children,
  }: {
    placeholder?: string;
    children?: React.ReactNode;
  }) => React.createElement('span', null, children ?? placeholder);

  const SelectContent = ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children);

  const SelectItem = ({ value, children }: { value?: string; children: React.ReactNode }) => {
    const { onValueChange } = React.useContext(SelectContext);
    return React.createElement(
      'div',
      { role: 'option', onClick: () => onValueChange(value ?? '') },
      children
    );
  };

  const SelectGroup = ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children);
  const SelectLabel = ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children);
  const SelectSeparator = () => React.createElement('div', { role: 'separator' });

  return {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    SelectGroup,
    SelectLabel,
    SelectSeparator,
  };
});

// Suppress console warnings in tests
if (process.env.NODE_ENV === 'test') {
  global.console = {
    ...console,
    warn: jest.fn(),
    error: jest.fn(),
  };
}

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Performance API mocks
Object.defineProperty(global, 'performance', {
  writable: true,
  value: {
    ...global.performance,
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => []),
  },
});

// Polyfill web API classes used by Next.js server modules
if (typeof (globalThis as Record<string, unknown>).Request === 'undefined') {
  (globalThis as Record<string, unknown>).Request = class Request {};
}
if (typeof (globalThis as Record<string, unknown>).Response === 'undefined') {
  (globalThis as Record<string, unknown>).Response = class Response {};
}
if (typeof (globalThis as Record<string, unknown>).Headers === 'undefined') {
  (globalThis as Record<string, unknown>).Headers = class Headers {};
}
