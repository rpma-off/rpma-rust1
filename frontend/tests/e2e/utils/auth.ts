import { expect, type Page } from '@playwright/test';
import { resetMockDb } from './mock';

export const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword',
};

export async function clearAuthState(page: Page): Promise<void> {
  await page.context().clearCookies();
  
  // Navigate to login and wait for page to be fully loaded
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  
  // Clear storage
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  
  // Wait for mock to be ready before resetting
  try {
    await page.waitForFunction(() => (window as Window & { __E2E_MOCKS__?: unknown }).__E2E_MOCKS__ !== undefined, { timeout: 5000 });
    await resetMockDb(page);
  } catch (error) {
    // Mock might already be reset or not available, continue anyway
    console.warn('Mock not available, continuing without reset');
  }
  
  // Wait a moment for any pending operations to complete
  await page.waitForTimeout(100);
}

export async function loginAsTestUser(page: Page): Promise<void> {
  await clearAuthState(page);
  
  // Wait for form to be ready
  await page.waitForSelector('input[name="email"]', { state: 'visible' });
  
  await page.locator('input[name="email"]').fill(TEST_USER.email);
  await page.locator('input[name="password"]').fill(TEST_USER.password);
  
  // Click the login button
  await page.getByRole('button', { name: /Se connecter|Connexion/i }).click();
  
  // Wait for navigation to complete (timeout increased for slower environments)
  await page.waitForURL(/\/(dashboard|tasks)(\/|$)/, { timeout: 45000 });
  
  // Verify we're on the expected page
  await expect(page).toHaveURL(/\/(dashboard|tasks)(\/|$)/);
}
