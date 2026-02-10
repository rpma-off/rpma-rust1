import { delayNextCommand, failNextCommand, resetDb, seedDb, handleInvoke } from './mock-db';
import { defaultFixtures, type MockFixtures } from './fixtures';

export interface E2eMockControls {
  reset: () => void;
  seed: (fixtures?: Partial<MockFixtures>) => void;
  failNext: (command: string, message: string) => void;
  delayNext: (command: string, ms: number) => void;
}

export function installMockControls(): void {
  if (typeof window === 'undefined') return;

  const controls: E2eMockControls = {
    reset: () => resetDb(defaultFixtures),
    seed: (fixtures?: Partial<MockFixtures>) => {
      if (!fixtures) return;
      seedDb(fixtures);
    },
    failNext: (command: string, message: string) => failNextCommand(command, message),
    delayNext: (command: string, ms: number) => delayNextCommand(command, ms)
  };

  (window as any).__E2E_MOCKS__ = controls;

  // Provide a Tauri IPC shim for direct invoke() calls
  (window as any).__TAURI_INTERNALS__ = {
    invoke: (command: string, args?: Record<string, unknown>) => handleInvoke(command, args),
    listen: () => Promise.resolve(),
    emit: () => Promise.resolve()
  };
}
