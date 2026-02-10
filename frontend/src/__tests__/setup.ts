import '@testing-library/jest-dom';

// Web crypto polyfill for tests
if (typeof global.crypto === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  global.crypto = require('crypto').webcrypto;
}

// TextEncoder/TextDecoder polyfill for tests
if (typeof global.TextEncoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}
// Mock Tauri APIs
jest.mock('@tauri-apps/api', () => ({
  invoke: jest.fn(),
  listen: jest.fn(),
  emit: jest.fn(),
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => [new URLSearchParams()],
  usePathname: () => '/',
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
  const React = require('react');
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
if (typeof (global as any).Request === 'undefined') {
  (global as any).Request = class Request {};
}
if (typeof (global as any).Response === 'undefined') {
  (global as any).Response = class Response {};
}
if (typeof (global as any).Headers === 'undefined') {
  (global as any).Headers = class Headers {};
}
