import { delayNextCommand, failNextCommand, resetDb, seedDb, handleInvoke } from './mock-db';
import { defaultFixtures, type MockFixtures } from './fixtures';
import type { JsonObject, JsonValue } from '@/types/json';

export interface E2eMockControls {
  reset: () => void;
  seed: (fixtures?: Partial<MockFixtures>) => void;
  failNext: (command: string, message: string) => void;
  delayNext: (command: string, ms: number) => void;
}

type TauriEventHandler = (payload: JsonValue) => void;

interface MockWindow extends Window {
  __E2E_MOCKS__?: E2eMockControls;
  __TAURI_INTERNALS__?: {
    invoke: (command: string, args?: JsonObject) => Promise<JsonValue>;
    listen: (event: string, handler: TauriEventHandler) => Promise<void>;
    emit: (event: string, payload?: JsonValue) => Promise<void>;
  };
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

  const mockWindow = window as MockWindow;
  mockWindow.__E2E_MOCKS__ = controls;

  // Provide a Tauri IPC shim for direct invoke() calls
  mockWindow.__TAURI_INTERNALS__ = {
    invoke: (command: string, args?: JsonObject) => handleInvoke(command, args),
    listen: (_event: string, _handler: TauriEventHandler) => Promise.resolve(),
    emit: (_event: string, _payload?: JsonValue) => Promise.resolve()
  };
}
