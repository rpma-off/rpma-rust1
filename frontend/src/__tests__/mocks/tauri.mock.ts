// Mock Tauri API for testing

// Mock Tauri core API
const mockTauriCore = {
  invoke: jest.fn(),
  listen: jest.fn(),
  emit: jest.fn(),
};

// Mock Tauri event API
const mockTauriEvent = {
  listen: jest.fn(),
  emit: jest.fn(),
  once: jest.fn(),
  unlisten: jest.fn(),
};

// Setup global mocks
global.__TAURI_INTERNALS__ = mockTauriCore;

// Mock Tauri modules
jest.mock('@tauri-apps/api/core', () => mockTauriCore);
jest.mock('@tauri-apps/api/event', () => mockTauriEvent);
jest.mock('@tauri-apps/api/core', () => ({
  invoke: mockTauriCore.invoke,
  listen: mockTauriCore.listen,
  emit: mockTauriCore.emit,
}));

// Mock Tauri dialog plugin
const mockDialog = {
  open: jest.fn(),
  save: jest.fn(),
  message: jest.fn(),
  ask: jest.fn(),
  confirm: jest.fn(),
};

jest.mock('@tauri-apps/plugin-dialog', () => mockDialog);

// Mock Tauri shell plugin
const mockShell = {
  open: jest.fn(),
  execute: jest.fn(),
};

jest.mock('@tauri-apps/plugin-shell', () => mockShell);

module.exports = {
  mockTauriCore,
  mockTauriEvent,
  mockDialog,
  mockShell,
};