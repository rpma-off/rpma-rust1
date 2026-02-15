import { test, expect } from '@playwright/test';
import { clearAuthState, loginAsTestUser, TEST_USER } from './utils/auth';
import { resetMockDb } from './utils/mock';

test.describe('User Authentication Smoke', () => {
  test('renders login form', async ({ page }) => {
    await clearAuthState(page);

    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Se connecter|Connexion/i })).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await resetMockDb(page);

    await page.locator('input[name="email"]').fill('invalid@example.com');
    await page.locator('input[name="password"]').fill('wrong-password');
    await page.getByRole('button', { name: /Se connecter|Connexion/i }).click();

    await expect(page).toHaveURL(/\/login(\/|$)/);
    await expect(page.getByText(/incorrect|mot de passe/i)).toBeVisible();
  });

  test('logs in and keeps authenticated session on protected route', async ({ page }) => {
    await loginAsTestUser(page);

    await expect(page).not.toHaveURL(/\/login(\/|$)/);
    await page.goto('/tasks');
    await expect(page).toHaveURL(/\/tasks(\/|$)/);
  });

  test('redirects unauthenticated users to login', async ({ page }) => {
    await clearAuthState(page);

    await page.goto('/tasks');
    await expect(page).toHaveURL(/\/login(\/|$)/, { timeout: 15000 });
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });

  test('shows loading state while authentication request is pending', async ({ page }) => {
    await page.goto('/login');
    await resetMockDb(page);

    await page.evaluate(() => {
      (window as Window & {
        __E2E_MOCKS__?: { delayNext: (command: string, delayMs: number) => void };
      }).__E2E_MOCKS__?.delayNext('auth_login', 1200);
    });

    await page.locator('input[name="email"]').fill(TEST_USER.email);
    await page.locator('input[name="password"]').fill(TEST_USER.password);
    await page.getByRole('button', { name: /Se connecter|Connexion/i }).click();

    await expect(page.getByRole('button', { name: /Connexion en cours|Se connecter/i })).toBeDisabled();
    await expect(page).toHaveURL(/\/(dashboard|tasks)(\/|$)/, { timeout: 45000 });
  });
});
