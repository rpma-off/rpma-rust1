import { expect, type Page } from "@playwright/test";
import { resetMockDb } from "./mock";

export const TEST_USER = {
  email: "test@example.com",
  password: "testpassword",
};

async function gotoLogin(page: Page): Promise<void> {
  await page.goto("/login", {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });

  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {
    // Keep going when the page remains busy during hydration/hot reload.
  });

  await page.waitForFunction(
    () => {
      const runtimeError = document.body?.innerText?.includes(
        "Unhandled Runtime Error",
      );
      const emailInput = document.querySelector('input[name="email"]');

      return !runtimeError && !!emailInput;
    },
    { timeout: 45000 },
  );

  await page.waitForSelector('input[name="email"]', {
    state: "visible",
    timeout: 20000,
  });
}

export async function clearAuthState(page: Page): Promise<void> {
  await page.context().clearCookies();
  await gotoLogin(page);

  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  try {
    await page.waitForFunction(
      () =>
        (window as Window & { __E2E_MOCKS__?: unknown }).__E2E_MOCKS__ !==
          undefined ||
        (window as Window & { __TAURI_INTERNALS__?: unknown })
          .__TAURI_INTERNALS__ !== undefined,
      { timeout: 15000 },
    );
    await resetMockDb(page);
  } catch {
    // Keep going when mock controls are not exposed yet.
  }
}

export async function loginAsTestUser(page: Page): Promise<void> {
  await clearAuthState(page);

  await page.locator('input[name="email"]').fill(TEST_USER.email);
  await page.locator('input[name="password"]').fill(TEST_USER.password);

  const loginButton = page.getByRole("button", {
    name: /Se connecter|Connexion/i,
  });
  await loginButton.waitFor({ state: "visible", timeout: 15000 });

  await page.waitForFunction(
    () => {
      const button = document.querySelector(
        'button[type="submit"]',
      ) as HTMLButtonElement | null;
      return !!button && !button.disabled;
    },
    { timeout: 15000 },
  );

  await loginButton.click();

  await page.waitForURL(/\/(dashboard|tasks)(\/|$)/, { timeout: 60000 });
  await expect(page).toHaveURL(/\/(dashboard|tasks)(\/|$)/);
  await page.waitForLoadState("domcontentloaded");
}
