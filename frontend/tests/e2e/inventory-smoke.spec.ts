import { test, expect, type Page } from '@playwright/test';
import { resetMockDb } from './utils/mock';

test.describe.configure({ mode: 'serial' });

async function login(page: Page) {
  await page.goto('/login');
  await resetMockDb(page);
  await page.getByRole('textbox', { name: /Adresse email|Email/i }).waitFor({ timeout: 90000 });
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'testpassword');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|tasks)(\/|$)/, { timeout: 45000 });
}

async function openInventory(page: Page) {
  if (/\/inventory(\/|$)/.test(page.url())) {
    return;
  }

  const navInventory = page.getByText(/Inventaire|Inventory/i).first();
  if (await navInventory.isVisible()) {
    await navInventory.click();
    await page.waitForURL(/\/inventory(\/|$)/, { timeout: 20000 });
  } else {
    await page.goto('/inventory');
  }
  await page.waitForLoadState('networkidle');
}

test.describe('Inventory Smoke', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    await login(page);
  });

  test('renders top KPI dashboard before tab content', async ({ page }) => {
    await openInventory(page);

    await expect(page.getByText(/Inventaire|Inventory/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Total mat|Total Materials/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Catalogue|Catalog/i)).toBeVisible({ timeout: 10000 });
  });

  test('desktop tab navigation switches between sections', async ({ page }) => {
    await openInventory(page);

    await page.getByRole('tab', { name: /Fournisseurs|Suppliers/i }).click();
    await expect(page.getByText(/Fournisseurs|Suppliers/i)).toBeVisible({ timeout: 10000 });

    await page.getByRole('tab', { name: /Rapports|Reports/i }).click();
    await expect(page.getByText(/R.sum. des mouvements|Movement Summary/i)).toBeVisible({ timeout: 10000 });

    await page.getByRole('tab', { name: /Param.tres|Settings/i }).click();
    await expect(page.getByText(/Cat.gories|Categories/i)).toBeVisible({ timeout: 10000 });
  });

  test('mobile sheet tab picker switches tabs', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openInventory(page);

    await page.getByRole('button', { name: /Mat|Materials/i }).first().click();
    await page.getByRole('button', { name: /Rapports|Reports/i }).click();

    await expect(page.getByText(/R.sum. des mouvements|Movement Summary/i)).toBeVisible({ timeout: 10000 });
  });

  test('can create material and see it in list', async ({ page }) => {
    await openInventory(page);

    await page.getByRole('button', { name: /Ajouter un mat|Add Material/i }).click();

    const sku = `E2E-SMOKE-${Date.now()}`;
    await page.fill('#sku', sku);
    await page.fill('#name', 'Smoke Material');
    await page.fill('#current_stock', '50');
    await page.fill('#minimum_stock', '10');
    await page.fill('#unit_cost', '12.5');

    await page.locator('[role="dialog"] button[type="submit"]').click();
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 10000 });

    await expect(page.getByText(sku)).toBeVisible({ timeout: 10000 });
  });
});
