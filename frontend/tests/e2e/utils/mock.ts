import type { Page } from '@playwright/test';

interface E2EMocks {
  reset: () => void;
  failNext: (command: string, message: string) => void;
  delayNext: (command: string, delayMs: number) => void;
}

type E2EWindow = Window & { __E2E_MOCKS__?: E2EMocks };

export async function resetMockDb(page: Page): Promise<void> {
  // Wait for mock to be ready with a shorter timeout and better error message
  try {
    await page.waitForFunction(() => (window as E2EWindow).__E2E_MOCKS__ !== undefined, { timeout: 5000 });
  } catch (error) {
    console.warn('Mock controls not found on window.__E2E_MOCKS__, checking window.__TAURI_INTERNALS__...');
    // Check if at least the Tauri internals are available
    const hasTauriInternals = await page.evaluate(() => typeof (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ !== 'undefined');
    if (!hasTauriInternals) {
      throw new Error('Neither __E2E_MOCKS__ nor __TAURI_INTERNALS__ found. Mock IPC is not initialized.');
    }
    // If Tauri internals exist but E2E mocks don't, the mock might be installed differently
    return;
  }
  await page.evaluate(() => {
    (window as E2EWindow).__E2E_MOCKS__?.reset();
  });
}

export async function setMockFailure(page: Page, command: string, message: string): Promise<void> {
  await page.evaluate(([cmd, msg]) => {
    (window as E2EWindow).__E2E_MOCKS__?.failNext(cmd, msg);
  }, [command, message]);
}

export async function setMockDelay(page: Page, command: string, ms: number): Promise<void> {
  await page.evaluate(([cmd, delayMs]) => {
    (window as E2EWindow).__E2E_MOCKS__?.delayNext(cmd, delayMs);
  }, [command, ms]);
}
