import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './utils/auth';

test.describe.configure({ mode: 'serial' });

test.describe('Inventory Smoke', () => {
  test.beforeEach(async ({ page }) => {
    // Increase timeout for beforeEach hook (server compilation can take >30s on cold start)
    test.setTimeout(120000);
    // loginAsTestUser handles mock initialization and navigation
    await loginAsTestUser(page);
  });

  test('loads inventory dashboard and default tabs', async ({ page }) => {
    // Navigate with longer timeout for initial compilation
    // Use load event instead of domcontentloaded for more stability
    await page.goto('/inventory', { waitUntil: 'load', timeout: 60000 });
    await expect(page).toHaveURL(/\/inventory(\/|$)/);

    // Wait for the page to be fully loaded (dynamic imports can take time)
    await page.waitForLoadState('networkidle', { timeout: 20000 });

    // The heading is in French: "Inventaire"
    await expect(page.getByRole('heading', { name: /Inventaire|Inventory/i }).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('tab', { name: /Mat|Material/i }).first()).toBeVisible();
    await expect(page.getByRole('tab', { name: /Fourn|Suppl/i }).first()).toBeVisible();
  });

  test('switches to suppliers tab', async ({ page }) => {
    await page.goto('/inventory');
    await page.getByRole('tab', { name: /Fourn|Suppl/i }).click();

    // Use first() to handle multiple matching headings
    await expect(page.getByRole('heading', { name: /Fourn|Suppl/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Ajouter|Add/i }).first()).toBeVisible();
  });

  test('creates a material and shows it in the list', async ({ page }) => {
    await page.goto('/inventory');

    // Look for the add material button with more flexible text matching
    await page.getByRole('button', { name: /Ajouter|Add/i }).first().click();

    const sku = `E2E-SMOKE-${Date.now()}`;
    await page.locator('#sku').fill(sku);
    await page.locator('#name').fill('Smoke Material');
    await page.locator('#current_stock').fill('50');
    await page.locator('#minimum_stock').fill('10');

    await page.getByRole('button', { name: /Cr.er|Create|Créer|Save|Enregistrer/i }).click();

    await expect(page.getByText(sku)).toBeVisible({ timeout: 15000 });
  });
});
