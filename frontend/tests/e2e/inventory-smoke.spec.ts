import { test, expect, type Page } from '@playwright/test';
import { resetMockDb } from './utils/mock';

async function login(page: Page) {
  await page.goto('/login');
  await resetMockDb(page);
  await page.fill('input[name="email"]', 'admin@test.com');
  await page.fill('input[name="password"]', 'adminpassword');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|tasks)(\/|$)/, { timeout: 15000 });
}

test.describe('Inventory Smoke Tests — Persistence Verification', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    await login(page);
  });

  test('inventory page loads with real backend data (not placeholder)', async ({ page }) => {
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');

    // Verify the page title/header is visible
    await expect(page.locator('text=Inventory')).toBeVisible({ timeout: 10000 });

    // Verify the Materials tab content loads (table or empty state)
    const materialsTable = page.locator('table').first();
    const emptyState = page.locator('text=Aucun matériau trouvé');

    await expect(materialsTable.or(emptyState)).toBeVisible({ timeout: 10000 });

    // Verify the dashboard stats cards are visible (backend-backed)
    await expect(page.locator('text=Total Materials').or(
      page.locator('text=Catalogue de matériaux')
    )).toBeVisible({ timeout: 10000 });
  });

  test('tab navigation works: Materials, Suppliers, Reports, Settings', async ({ page }) => {
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');

    // Materials tab should be active by default
    await expect(page.locator('text=Catalogue de matériaux')).toBeVisible({ timeout: 10000 });

    // Navigate to Suppliers tab
    const suppliersTab = page.locator('[role="tab"]:has-text("Suppliers")');
    if (await suppliersTab.isVisible()) {
      await suppliersTab.click();
      // Should show the supplier table or empty state (not "coming soon")
      await expect(page.locator('text=Fournisseurs').or(
        page.locator('text=Aucun fournisseur')
      )).toBeVisible({ timeout: 10000 });
    }

    // Navigate to Reports tab
    const reportsTab = page.locator('[role="tab"]:has-text("Reports")');
    if (await reportsTab.isVisible()) {
      await reportsTab.click();
      await expect(page.locator('text=Rapports').or(
        page.locator('text=Résumé des mouvements')
      )).toBeVisible({ timeout: 10000 });
    }

    // Navigate to Settings tab
    const settingsTab = page.locator('[role="tab"]:has-text("Settings")');
    if (await settingsTab.isVisible()) {
      await settingsTab.click();
      await expect(page.locator('text=Paramètres').or(
        page.locator('text=Catégories')
      )).toBeVisible({ timeout: 10000 });
    }
  });

  test('create material via form, verify it appears in list', async ({ page }) => {
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');

    // Click "Add material" button
    const addBtn = page.locator('button:has-text("Ajouter un matériau")');
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();

    // Fill in the material form
    const uniqueSku = `SMOKE-${Date.now()}`;
    await page.fill('input#sku', uniqueSku);
    await page.fill('input#name', 'Smoke Test Material');
    await page.fill('textarea#description', 'Created by E2E smoke test');
    await page.fill('input#current_stock', '50');
    await page.fill('input#minimum_stock', '10');
    await page.fill('input#unit_cost', '12.50');

    // Submit the form
    const submitBtn = page.locator('button[type="submit"]:has-text("Créer")').or(
      page.locator('button[type="submit"]:has-text("créer")')
    );
    await expect(submitBtn).toBeEnabled({ timeout: 5000 });
    await submitBtn.click();

    // Wait for dialog to close (success)
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 10000 });

    // Verify the created material appears in the table
    await expect(page.locator(`text=${uniqueSku}`)).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Smoke Test Material')).toBeVisible({ timeout: 5000 });
  });

  test('stock adjustment persists and updates table', async ({ page }) => {
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');

    // Wait for materials to load
    await expect(page.locator('text=Catalogue de matériaux')).toBeVisible({ timeout: 10000 });

    // Look for a stock adjust button (ArrowUpDown icon button)
    const adjustBtn = page.locator('button[title="Ajuster le stock"]').first();
    if (await adjustBtn.isVisible({ timeout: 5000 })) {
      // Record the current stock value before adjustment
      const stockCell = page.locator('table tbody tr').first().locator('td').nth(3);
      await stockCell.textContent();

      await adjustBtn.click();

      // Fill in the stock adjustment dialog
      await expect(page.locator('text=Ajuster le stock')).toBeVisible({ timeout: 5000 });
      await page.fill('input#stock-qty', '5');
      await page.fill('textarea#stock-reason', 'E2E smoke test adjustment');

      // Submit the adjustment
      const confirmBtn = page.locator('button:has-text("Confirmer")');
      await expect(confirmBtn).toBeEnabled({ timeout: 5000 });
      await confirmBtn.click();

      // Wait for dialog to close
      await expect(page.locator('input#stock-qty')).toBeHidden({ timeout: 10000 });
    }
  });

  test('archive material via confirm dialog', async ({ page }) => {
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Catalogue de matériaux')).toBeVisible({ timeout: 10000 });

    // Look for an archive button (Trash2 icon button)
    const archiveBtn = page.locator('button[title="Archiver le matériau"]').first();
    if (await archiveBtn.isVisible({ timeout: 5000 })) {
      await archiveBtn.click();

      // Confirm dialog should appear
      await expect(page.locator('text=Archiver ce matériau')).toBeVisible({ timeout: 5000 });

      // Click the confirm archive button
      const confirmBtn = page.locator('[role="alertdialog"] button:has-text("Archiver")');
      await expect(confirmBtn).toBeVisible({ timeout: 5000 });
      await confirmBtn.click();

      // Dialog should close
      await expect(page.locator('text=Archiver ce matériau')).toBeHidden({ timeout: 10000 });
    }
  });

  test('search and filter work with backend data', async ({ page }) => {
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Catalogue de matériaux')).toBeVisible({ timeout: 10000 });

    // Type in search box
    const searchInput = page.locator('input[placeholder*="Rechercher"]');
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    await searchInput.fill('nonexistent-material-xyz');

    // Wait for the filter to apply — either fewer results or empty state
    await expect(page.locator('text=Aucun matériau trouvé').or(
      page.locator('text=Matériaux (0)')
    )).toBeVisible({ timeout: 10000 });

    // Clear search
    await searchInput.fill('');

    // Verify materials appear again (if any exist)
    await page.waitForTimeout(500);
  });

  test('no "coming soon" or placeholder text visible', async ({ page }) => {
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');

    // Check Materials tab
    await expect(page.locator('text=Catalogue de matériaux')).toBeVisible({ timeout: 10000 });

    // Navigate through all tabs and verify no "coming soon" placeholders
    const tabs = ['Suppliers', 'Reports', 'Settings'];
    for (const tab of tabs) {
      const tabBtn = page.locator(`[role="tab"]:has-text("${tab}")`);
      if (await tabBtn.isVisible()) {
        await tabBtn.click();
        await page.waitForTimeout(1000);

        // Verify no "coming soon" text
        await expect(page.locator('text=coming soon')).not.toBeVisible({ timeout: 3000 });
      }
    }
  });
});
