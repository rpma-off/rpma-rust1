// Import and extend Jest matchers
require('@testing-library/jest-dom')

// Make sure custom matchers are available globally
const customMatchers = require('@testing-library/jest-dom/matchers');
Object.keys(customMatchers).forEach(matcher => {
  expect.extend({
    [matcher]: customMatchers[matcher]
  });
});

// Mock Tauri API
global.__TAURI_INTERNALS__ = {
  invoke: require('jest').fn(),
  listen: require('jest').fn(),
  emit: require('jest').fn(),
}

// Mock window.__TAURI_INTERNALS__
Object.defineProperty(window, '__TAURI_INTERNALS__', {
  value: {
    invoke: require('jest').fn(),
    listen: require('jest').fn(),
    emit: require('jest').fn(),
  },
  writable: true,
})

// Mock require for Tauri API
const { jest } = require('@jest/globals');

jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
  listen: jest.fn(),
  emit: jest.fn(),
}))

jest.mock('@tauri-apps/api/event', () => ({
  listen: jest.fn(),
  emit: jest.fn(),
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  usePathname: () => '/',
}))

// Setup localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock