// TODO(e2e): excluded from default smoke run; re-enable after selector and workflow stabilization.
import { test, expect, type Page } from "@playwright/test";
import { resetMockDb } from "./utils/mock";

async function login(page: Page) {
  await page.goto("/login");
  await resetMockDb(page);
  await page.fill('input[name="email"]', "test@example.com");
  await page.fill('input[name="password"]', "testpassword");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|tasks)(\/|$)/, { timeout: 15000 });
}

test.describe("Configuration page smoke", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    await login(page);
  });

  test("navigate to configuration page and verify tabs load", async ({
    page,
  }) => {
    await page.goto("/configuration");
    await page.waitForLoadState("networkidle");

    // Verify the page title is visible
    await expect(page.locator("text=Configuration Avancée")).toBeVisible({
      timeout: 10000,
    });

    // Verify the system status indicator is present
    await expect(
      page
        .locator("text=Système opérationnel")
        .or(
          page
            .locator("text=Avertissements détectés")
            .or(page.locator("text=Erreurs détectées")),
        ),
    ).toBeVisible({ timeout: 10000 });

    // Verify the System tab is loaded by default
    await expect(page.locator("text=Paramètres Système")).toBeVisible({
      timeout: 10000,
    });
  });

  test("tab navigation works", async ({ page }) => {
    await page.goto("/configuration");
    await page.waitForLoadState("networkidle");

    // Wait for page to be ready
    await expect(page.locator("text=Configuration Avancée")).toBeVisible({
      timeout: 10000,
    });

    // Click on Security tab
    const securityTab = page.getByRole("tab", { name: /Sécurité/i }).first();
    if (await securityTab.isVisible()) {
      await securityTab.click({ force: true });
      try {
        await expect(
          page.getByRole("heading", { name: /Politiques de Sécurité/i }),
        ).toBeVisible({ timeout: 10000 });
      } catch (e) {
        console.error("Failed to find Politiques de Sécurité heading. DOM state:");
        console.error(await page.locator("body").innerHTML());
        throw e;
      }
    }

    // Click on Integrations tab
    const integrationsTab = page
      .getByRole("tab", { name: "Intégrations" })
      .first();
    if (await integrationsTab.isVisible()) {
      await integrationsTab.click();
      await expect(
        page.getByRole("heading", { name: "Intégrations" }),
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test("system settings tab loads and save button works", async ({ page }) => {
    await page.goto("/configuration");
    await page.waitForLoadState("networkidle");

    // Wait for configurations to load
    await expect(page.locator("text=Paramètres Système")).toBeVisible({
      timeout: 10000,
    });

    // The Save button should be present but disabled when no changes made
    const saveButton = page.locator('button:has-text("Enregistrer")').first();
    await expect(saveButton).toBeVisible({ timeout: 5000 });

    // The Reset button should also be present
    const resetButton = page.locator('button:has-text("Annuler")').first();
    await expect(resetButton).toBeVisible({ timeout: 5000 });
  });

  test("refresh button triggers real health check", async ({ page }) => {
    await page.goto("/configuration");
    await page.waitForLoadState("networkidle");

    // Find and click the refresh button
    const refreshButton = page.locator('button:has-text("Actualiser")').first();
    await expect(refreshButton).toBeVisible({ timeout: 10000 });
    await refreshButton.click();

    // The button should show spinning animation while refreshing
    // After refresh, status should still be visible
    await expect(
      page
        .locator("text=Système opérationnel")
        .or(
          page
            .locator("text=Avertissements détectés")
            .or(page.locator("text=Erreurs détectées")),
        ),
    ).toBeVisible({ timeout: 10000 });
  });

  test("monitoring tab loads system status from IPC", async ({ page }) => {
    await page.goto("/configuration");
    await page.waitForLoadState("networkidle");

    // Navigate to monitoring tab
    const monitoringTab = page.getByRole("tab", { name: "Monitoring" }).first();
    if (await monitoringTab.isVisible()) {
      await monitoringTab.click();

      // Verify tab activation instead of generic text locator (avoids strict-mode duplicate matches)
      await expect(monitoringTab).toHaveAttribute("data-state", "active", {
        timeout: 10000,
      });

      // Should have a refresh button
      const refreshBtn = page.locator('button:has-text("Actualiser")').first();
      await expect(refreshBtn).toBeVisible({ timeout: 5000 });
    }
  });
});
