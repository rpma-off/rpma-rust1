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

test.describe("Connectivity smoke", () => {
  test("login -> protected navigation -> logout", async ({ page }) => {
    test.setTimeout(60000);
    await login(page);

    await page.goto("/tasks", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/tasks(\/|$)/, { timeout: 20000 });
    await expect(page.getByText(/Tâches|Jobs/i).first()).toBeVisible({
      timeout: 15000,
    });

    await page.goto("/clients", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/clients(\/|$)/, { timeout: 20000 });
    await expect(page.getByText(/Clients/i).first()).toBeVisible({
      timeout: 15000,
    });

    const userMenuButton = page
      .locator('button:has-text("Connecté en tant que")')
      .first();
    if (await userMenuButton.isVisible()) {
      await userMenuButton.click();
    }

    const logoutButton = page
      .getByRole("button", { name: /Déconnexion|Logout/i })
      .first();
    await expect(logoutButton).toBeVisible({ timeout: 10000 });
    await logoutButton.click();
    await page.waitForURL(/\/login/, { timeout: 20000 });
  });
});
