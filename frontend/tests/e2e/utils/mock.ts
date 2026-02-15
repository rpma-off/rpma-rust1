import type { Page } from '@playwright/test';

interface E2EMocks {
  reset: () => void;
  failNext: (command: string, message: string) => void;
  delayNext: (command: string, delayMs: number) => void;
}

type E2EWindow = Window & { __E2E_MOCKS__?: E2EMocks };

export async function resetMockDb(page: Page): Promise<void> {
  await page.waitForFunction(() => (window as E2EWindow).__E2E_MOCKS__ !== undefined);
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
