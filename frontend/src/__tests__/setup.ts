import '@testing-library/jest-dom';
import 'jest-webextension-mock';

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
global.IntersectionObserver = class IntersectionObserver {
  observe() {}
  disconnect() {}
  unobserve() {}
};

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