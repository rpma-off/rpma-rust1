// TODO(e2e): excluded from default smoke run; re-enable after selector and workflow stabilization.
import { test, expect, type Page } from '@playwright/test';
import { resetMockDb } from './utils/mock';

async function login(page: Page) {
  await page.goto('/login');
  await resetMockDb(page);
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'testpassword');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|tasks)(\/|$)/, { timeout: 15000 });
}

test.describe('Connectivity smoke', () => {
  test('login -> tasks list -> task detail -> intervention step -> logout', async ({ page }) => {
    test.setTimeout(60000);
    await login(page);

    await page.goto('/tasks');
    await expect(page.locator('h1')).toContainText(/Jobs|Tâches/i);

    // Default view is 'table': task rows are inside .divide-y; fallback to .animate-fadeIn for list view
    const firstTaskCard = page.locator('.divide-y > div, .animate-fadeIn').first();
    await expect(firstTaskCard).toBeVisible({ timeout: 15000 });
    await firstTaskCard.click();

    await page.waitForURL(/\/tasks\/[a-zA-Z0-9-]+/, { timeout: 10000 });
    await expect(page.locator('h1')).toBeVisible();

    const startIntervention = page.locator('button:has-text("Commencer"), button:has-text("Démarrer"), button:has-text("Start")').first();
    if (await startIntervention.isVisible()) {
      await startIntervention.click();
      await expect(page).toHaveURL(/\/workflow|\/intervention|\/tasks\/[a-zA-Z0-9-]+\//, { timeout: 10000 });
    }

    const completeStep = page.locator('button:has-text("Terminer"), button:has-text("Complete"), button:has-text("Confirmer")').first();
    if (await completeStep.isVisible()) {
      await completeStep.click();

      const completedMarker = page.locator('.step.completed, text=/terminée|completed/i').first();
      await expect(completedMarker).toBeVisible({ timeout: 10000 });

      await page.reload();
      await expect(page.locator('.step.completed, text=/terminée|completed/i').first()).toBeVisible({ timeout: 10000 });
    }

    // Open the user dropdown first (logout is inside it)
    const userMenuButton = page.locator('button:has-text("Connecté en tant que")').first();
    if (await userMenuButton.isVisible()) {
      await userMenuButton.click();
    }
    const logoutButton = page.locator('button:has-text("Déconnexion"), a:has-text("Déconnexion"), button:has-text("Logout")').first();
    await expect(logoutButton).toBeVisible({ timeout: 5000 });
    await logoutButton.click();
    await page.waitForURL(/\/login/, { timeout: 10000 });
  });
});
