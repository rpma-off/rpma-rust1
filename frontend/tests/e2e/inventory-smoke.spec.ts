import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './utils/auth';

test.describe('Inventory Smoke', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('loads inventory dashboard and default tabs', async ({ page }) => {
    await page.goto('/inventory');
    await expect(page).toHaveURL(/\/inventory(\/|$)/);

    await expect(page.getByRole('heading', { level: 1, name: /Invent|Inventory/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Mat|Material/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Fourn|Suppl/i })).toBeVisible();
  });

  test('switches to suppliers tab', async ({ page }) => {
    await page.goto('/inventory');
    await page.getByRole('tab', { name: /Fourn|Suppl/i }).click();

    await expect(page.getByRole('heading', { level: 2, name: /Fourn|Suppl/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Ajouter|Add/i })).toBeVisible();
  });

  test('creates a material and shows it in the list', async ({ page }) => {
    await page.goto('/inventory');

    await page.getByRole('button', { name: /Ajouter.*Mat|Add.*Material/i }).click();

    const sku = `E2E-SMOKE-${Date.now()}`;
    await page.locator('#sku').fill(sku);
    await page.locator('#name').fill('Smoke Material');
    await page.locator('#current_stock').fill('50');
    await page.locator('#minimum_stock').fill('10');

    await page.getByRole('button', { name: /Cr.er|Create|Créer|Save|Enregistrer/i }).click();

    await expect(page.getByText(sku)).toBeVisible({ timeout: 15000 });
  });
});
