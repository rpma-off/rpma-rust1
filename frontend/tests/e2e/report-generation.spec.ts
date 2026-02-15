import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './utils/auth';
import { setMockDelay } from './utils/mock';

test.describe('Report Generation Smoke', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('loads reports page and base content', async ({ page }) => {
    await page.goto('/reports');

    await expect(page).toHaveURL(/\/reports(\/|$)/);
    await expect(page.locator('[data-testid="date-range-picker"]')).toBeVisible();
    await expect(page.locator('nav[aria-label="Report Categories"]')).toBeVisible();
    await expect(page.locator('[data-testid="report-content"]')).toBeVisible({ timeout: 20000 });
  });

  test('switches report categories', async ({ page }) => {
    await page.goto('/reports');

    await page.getByRole('button', { name: /T.ches|Tasks/i }).first().click();
    await expect(page.locator('[data-testid="report-content"]')).toBeVisible({ timeout: 20000 });

    await page.getByRole('button', { name: /Clients/i }).first().click();
    await expect(page.locator('[data-testid="report-content"]')).toBeVisible({ timeout: 20000 });
  });

  test('shows loading indicator while task report is generated', async ({ page }) => {
    await page.goto('/reports');
    await setMockDelay(page, 'get_task_completion_report', 1800);

    await page.getByRole('button', { name: /T.ches|Tasks/i }).first().click();
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="report-content"]')).toBeVisible({ timeout: 20000 });
  });

  test('opens export controls and triggers CSV export action', async ({ page }) => {
    await page.goto('/reports');

    await page.getByRole('button', { name: /Exporter|Export/i }).first().click();
    await expect(page.getByRole('menu')).toBeVisible();

    await page.getByRole('menuitem', { name: /CSV/i }).first().click();
    await expect(page.locator('[data-testid="report-content"]')).toBeVisible({ timeout: 20000 });
  });
});
