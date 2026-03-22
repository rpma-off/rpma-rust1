import { expect, type Page } from '@playwright/test';
import { resetMockDb } from './mock';

export const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword',
};

export async function clearAuthState(page: Page): Promise<void> {
  await page.context().clearCookies();
  
  // Navigate to login - use domcontentloaded for faster response
  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
  
  // Clear storage completely to ensure AuthProvider doesn't try to validate a session
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    // Also clear any secure storage keys that might exist
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('session') || key.includes('auth') || key.includes('secure'))) {
        localStorage.removeItem(key);
      }
    }
  });
  
  // Wait for mock to be ready before resetting with longer timeout
  try {
    await page.waitForFunction(() => (window as Window & { __E2E_MOCKS__?: unknown }).__E2E_MOCKS__ !== undefined, { timeout: 15000 });
    await resetMockDb(page);
  } catch (_error) {
    // Mock might already be reset or not available, continue anyway
    console.warn('Mock not available, continuing without reset');
  }
  
  // Reload page to force AuthProvider to re-initialize without any stored session
  // This ensures the form starts fresh without being stuck in loading state
  await page.reload({ waitUntil: 'domcontentloaded' });
  
  // Wait for React to mount and form to be ready
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await page.waitForSelector('input[name="email"]', { state: 'visible', timeout: 15000 });
}

export async function loginAsTestUser(page: Page): Promise<void> {
  await clearAuthState(page);

  // Ensure mock is ready before attempting login with extended timeout
  try {
    await page.waitForFunction(() => (window as Window & { __E2E_MOCKS__?: unknown }).__E2E_MOCKS__ !== undefined, { timeout: 20000 });
  } catch (_error) {
    console.warn('Mock initialization timeout - page may need reload');
    // Try reloading the page to trigger mock initialization
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => (window as Window & { __E2E_MOCKS__?: unknown }).__E2E_MOCKS__ !== undefined, { timeout: 20000 });
  }

  await page.locator('input[name="email"]').fill(TEST_USER.email);
  await page.locator('input[name="password"]').fill(TEST_USER.password);

  // Wait for the login button to be enabled (form might be in loading state initially)
  const loginButton = page.getByRole('button', { name: /Se connecter|Connexion/i });
  await loginButton.waitFor({ state: 'visible', timeout: 10000 });
  
  // Wait for button to be enabled (it may be disabled during auth loading state)
  await page.waitForFunction(() => {
    const button = document.querySelector('button[type="submit"]');
    return button && !button.hasAttribute('disabled') && !button.disabled;
  }, { timeout: 15000 });

  // Click the login button
  await loginButton.click();

  // Wait for navigation to complete (check for dashboard or tasks URL)
  await page.waitForURL(/\/(dashboard|tasks)(\/|$)/, { timeout: 60000 });

  // Verify we're on the expected page
  await expect(page).toHaveURL(/\/(dashboard|tasks)(\/|$)/);
}
