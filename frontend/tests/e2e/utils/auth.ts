import { expect, type Page } from "@playwright/test";
import { resetMockDb } from "./mock";

export const TEST_USER = {
  email: "test@example.com",
  password: "testpassword",
};

async function gotoLogin(page: Page): Promise<void> {
  console.log(`[E2E] Navigating to /login...`);
  await page.goto("/login", {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });

  console.log(`[E2E] Waiting for email input...`);
  // Just wait for the selector directly, it's more robust than waitForFunction with complex logic
  try {
    await page.waitForSelector('input[name="email"]', {
      state: "visible",
      timeout: 90000,
    });
  } catch (err) {
    console.error(`[E2E] Failed to find email input: ${err.message}`);
    
    // Check for runtime errors if it timed out
    const bodyText = await page.innerText('body').catch(() => "");
    if (bodyText.includes("Unhandled Runtime Error") || 
        bodyText.includes("Internal Server Error") ||
        bodyText.includes("Application error")) {
      throw new Error(`Runtime error detected on login page: ${bodyText.substring(0, 100)}...`);
    }
    
    // Check if we are still on the skeleton
    const hasSkeleton = await page.locator('.animate-pulse').count() > 0;
    if (hasSkeleton) {
      console.error("[E2E] Page is still showing a skeleton/loading state.");
    }
    
    throw err;
  }

  console.log(`[E2E] Login page loaded successfully.`);
}

export async function clearAuthState(page: Page): Promise<void> {
  // First navigate to a blank page or any page to be able to clear storage
  // but better yet, clear it on the current page if possible, or just clear cookies first.
  await page.context().clearCookies();
  
  // Navigate to login but we'll clear storage right after it starts loading
  // or before if we are already on a page.
  await page.goto("/login", {
    waitUntil: "commit", // Wait only until the navigation is committed
  });

  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  // Now perform the full gotoLogin
  await gotoLogin(page);

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
