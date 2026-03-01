/**
 * IPC Adapter interface.
 *
 * Defines the contract that both the real Tauri adapter and the
 * deterministic test adapter must satisfy.
 *
 * The type is derived from the production ipcClient so it stays in sync
 * automatically — no manual duplication.
 */
import type { ipcClient } from './client';

/** Shape of the IPC client used by all consumers. */
export type IpcAdapter = typeof ipcClient;
