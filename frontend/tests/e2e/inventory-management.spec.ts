// TODO(e2e): excluded from default smoke run; re-enable after selector and workflow stabilization.
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

test.describe('Inventory Management', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    await login(page);
    await openInventory(page);
  });

  test('materials filters work and clear resets list', async ({ page }) => {
    await expect(page.getByText(/Catalogue|Catalog/i)).toBeVisible({ timeout: 10000 });

    const search = page.getByRole('textbox', { name: /Rechercher|Search/i });
    await search.fill('nonexistent-e2e-material');

    await expect(page.getByText(/Aucun mat|No material/i)).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Effacer les filtres|Clear filters/i }).click();
    await expect(search).toHaveValue('');
  });

  test('stock adjustment dialog enforces reason and quantity', async ({ page }) => {
    const adjustButton = page.getByRole('button', { name: /Ajuster le stock|Adjust stock/i }).first();
    await expect(adjustButton).toBeVisible({ timeout: 10000 });
    await adjustButton.click();

    await expect(page.getByText(/Ajuster le stock|Adjust stock/i)).toBeVisible({ timeout: 10000 });

    const submitAdjustment = page.getByRole('button', { name: /Confirmer l'ajustement|Confirm adjustment/i });
    await expect(submitAdjustment).toBeDisabled();

    await page.fill('#stock-qty', '5');
    await page.fill('#stock-reason', 'E2E adjustment');
    await expect(submitAdjustment).toBeEnabled();
  });

  test('supplier tab create flow works', async ({ page }) => {
    await page.getByRole('tab', { name: /Fournisseurs|Suppliers/i }).click();
    await expect(page.getByRole('tab', { name: /Fournisseurs|Suppliers/i })).toBeVisible({ timeout: 10000 });

    await page.fill('#supplierName', `E2E Supplier ${Date.now()}`);
    await page.fill('#supplierEmail', 'supplier-e2e@example.com');
    await page.fill('#supplierPhone', '+1-555-0100');

    await page.locator('button[type="submit"]').filter({ hasText: /Ajouter/i }).first().click();

    await expect(page.getByText(/supplier-e2e@example.com/i)).toBeVisible({ timeout: 10000 });
  });

  test('reports tab renders low stock and movement sections', async ({ page }) => {
    await page.getByRole('tab', { name: /Rapports|Reports/i }).click();

    await expect(page.getByText(/Alertes stock bas|Low Stock/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Mouvements|Movement/i)).toBeVisible({ timeout: 10000 });
  });

  test('settings tab create category flow works', async ({ page }) => {
    await page.getByRole('tab', { name: /Param.tres|Settings/i }).click();
    await expect(page.getByRole('heading', { name: /Cat.gories|Categories/i })).toBeVisible({ timeout: 10000 });

    const categoryName = `E2E Category ${Date.now()}`;
    await page.fill('#categoryName', categoryName);

    await page.locator('button[type="submit"]').filter({ hasText: /Ajouter/i }).first().click();

    await expect(page.getByText(categoryName)).toBeVisible({ timeout: 10000 });
  });
});
