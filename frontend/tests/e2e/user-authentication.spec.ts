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
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await resetMockDb(page);
    
    // Wait for form to be ready
    await page.waitForSelector('input[name="email"]', { state: 'visible' });

    await page.locator('input[name="email"]').fill('invalid@example.com');
    await page.locator('input[name="password"]').fill('wrong-password');
    await page.getByRole('button', { name: /Se connecter|Connexion/i }).click();

    await expect(page).toHaveURL(/\/login(\/|$)/);
    // Check for error message - it's displayed in a paragraph near the form
    await expect(page.getByText('Email ou mot de passe incorrect').first()).toBeVisible();
  });

  test('logs in and keeps authenticated session on protected route', async ({ page }) => {
    await loginAsTestUser(page);

    // Wait for page to fully load after login
    await page.waitForLoadState('domcontentloaded');
    
    // Verify we're not on the login page
    const currentUrl = page.url();
    expect(currentUrl).not.toMatch(/\/login(\/|$)/);
    
    // Navigate to tasks and verify access
    await page.goto('/tasks', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/tasks(\/|$)/, { timeout: 15000 });
  });

  test('redirects unauthenticated users to login', async ({ page }) => {
    await clearAuthState(page);

    await page.goto('/tasks');
    await expect(page).toHaveURL(/\/login(\/|$)/, { timeout: 15000 });
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });

  test('completes login when authentication request is delayed', async ({ page }) => {
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

    await expect(page).toHaveURL(/\/login(\/|$)/);
    await expect(page).toHaveURL(/\/(dashboard|tasks)(\/|$)/, { timeout: 45000 });
  });
});
