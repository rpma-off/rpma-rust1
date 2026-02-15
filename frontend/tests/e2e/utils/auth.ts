import { expect, type Page } from '@playwright/test';
import { resetMockDb } from './mock';

export const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword',
};

export async function clearAuthState(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await resetMockDb(page);
  await page.goto('/login');
}

export async function loginAsTestUser(page: Page): Promise<void> {
  await clearAuthState(page);
  await page.locator('input[name="email"]').fill(TEST_USER.email);
  await page.locator('input[name="password"]').fill(TEST_USER.password);
  await page.getByRole('button', { name: /Se connecter|Connexion/i }).click();
  await expect(page).toHaveURL(/\/(dashboard|tasks)(\/|$)/, { timeout: 45000 });
}
