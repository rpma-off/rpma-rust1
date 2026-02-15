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
type TauriCoreCallback = (payload?: JsonValue) => void;

interface EventListenerEntry {
  event: string;
  callbackId: number;
}

interface CallbackEntry {
  callback: TauriCoreCallback;
  once: boolean;
}

interface MockWindow extends Window {
  __E2E_MOCKS__?: E2eMockControls;
  __TAURI_INTERNALS__?: {
    invoke: (command: string, args?: JsonObject, options?: unknown) => Promise<JsonValue>;
    transformCallback: (callback?: TauriCoreCallback, once?: boolean) => number;
    unregisterCallback: (callbackId: number) => void;
    convertFileSrc: (filePath: string, protocol?: string) => string;
    listen: (event: string, handler: TauriEventHandler) => Promise<() => void>;
    emit: (event: string, payload?: JsonValue) => Promise<void>;
  };
  __TAURI_EVENT_PLUGIN_INTERNALS__?: {
    unregisterListener: (event: string, eventId: number) => void;
  };
}

export function installMockControls(): void {
  if (typeof window === 'undefined') return;

  const callbacks = new Map<number, CallbackEntry>();
  const listenersByEvent = new Map<string, Set<number>>();
  const listenersById = new Map<number, EventListenerEntry>();
  let nextCallbackId = 1;
  let nextEventId = 1;

  const removeListenerById = (eventId: number, expectedEvent?: string) => {
    const listener = listenersById.get(eventId);
    if (!listener) return;
    if (expectedEvent && listener.event !== expectedEvent) return;

    listenersById.delete(eventId);
    const eventSet = listenersByEvent.get(listener.event);
    if (!eventSet) return;

    eventSet.delete(eventId);
    if (eventSet.size === 0) {
      listenersByEvent.delete(listener.event);
    }
  };

  const registerListener = (event: string, callbackId: number): number => {
    const eventId = nextEventId++;
    listenersById.set(eventId, { event, callbackId });

    const eventSet = listenersByEvent.get(event) || new Set<number>();
    eventSet.add(eventId);
    listenersByEvent.set(event, eventSet);

    return eventId;
  };

  const transformCallback = (callback?: TauriCoreCallback, once: boolean = false): number => {
    const callbackId = nextCallbackId++;
    callbacks.set(callbackId, {
      callback: callback || (() => undefined),
      once
    });
    return callbackId;
  };

  const unregisterCallback = (callbackId: number): void => {
    callbacks.delete(callbackId);

    for (const [eventId, listener] of listenersById.entries()) {
      if (listener.callbackId === callbackId) {
        removeListenerById(eventId);
      }
    }
  };

  const emitEvent = (event: string, payload?: JsonValue): void => {
    const eventListeners = listenersByEvent.get(event);
    if (!eventListeners || eventListeners.size === 0) return;

    for (const eventId of [...eventListeners]) {
      const listener = listenersById.get(eventId);
      if (!listener) continue;

      const callbackEntry = callbacks.get(listener.callbackId);
      if (!callbackEntry) {
        removeListenerById(eventId);
        continue;
      }

      try {
        callbackEntry.callback({ event, id: eventId, payload } as unknown as JsonValue);
      } catch (error) {
        console.error('Mock event listener callback failed', error);
      }

      if (callbackEntry.once) {
        unregisterCallback(listener.callbackId);
      }
    }
  };

  const invokeWithMockEventSupport = async (command: string, args?: JsonObject): Promise<JsonValue> => {
    if (command === 'plugin:event|listen') {
      const event = String(args?.event || '');
      const callbackId = Number(args?.handler);
      if (!event || Number.isNaN(callbackId)) {
        return 0;
      }
      return registerListener(event, callbackId);
    }

    if (command === 'plugin:event|unlisten') {
      const event = String(args?.event || '');
      const eventId = Number(args?.eventId);
      if (!Number.isNaN(eventId)) {
        removeListenerById(eventId, event || undefined);
      }
      return null;
    }

    if (command === 'plugin:event|emit' || command === 'plugin:event|emit_to') {
      const event = String(args?.event || '');
      if (event) {
        emitEvent(event, args?.payload as JsonValue);
      }
      return null;
    }

    return handleInvoke(command, args) as Promise<JsonValue>;
  };

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
    invoke: (command: string, args?: JsonObject) => invokeWithMockEventSupport(command, args),
    transformCallback,
    unregisterCallback,
    convertFileSrc: (filePath: string, protocol: string = 'asset') =>
      `${protocol}://${filePath.replace(/\\/g, '/')}`,
    listen: async (event: string, handler: TauriEventHandler) => {
      const callbackId = transformCallback((eventPayload) => {
        const payload =
          eventPayload && typeof eventPayload === 'object' && 'payload' in (eventPayload as Record<string, unknown>)
            ? (eventPayload as Record<string, JsonValue>).payload
            : eventPayload;
        handler(payload as JsonValue);
      });

      const eventId = registerListener(event, callbackId);
      return () => removeListenerById(eventId, event);
    },
    emit: async (event: string, payload?: JsonValue) => {
      emitEvent(event, payload);
    }
  };

  mockWindow.__TAURI_EVENT_PLUGIN_INTERNALS__ = {
    unregisterListener: (event: string, eventId: number) => {
      removeListenerById(eventId, event);
    }
  };
}
