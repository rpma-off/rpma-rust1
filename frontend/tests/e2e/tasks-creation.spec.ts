import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './utils/auth';

function futureDate(daysAhead: number = 2): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().split('T')[0];
}

async function goToScheduleStep(page: import('@playwright/test').Page) {
  await page.goto('/tasks/new');

  await page.locator('input[name="vehicle_plate"]').fill('AB123CD');
  await page.locator('input[name="vehicle_make"]').fill('Tesla');
  await page.locator('input[name="vehicle_model"]').fill('Model 3');
  await page.locator('input[name="vehicle_year"]').fill('2024');

  await page.getByRole('button', { name: /Suivant|Next/i }).click();
  await page.getByRole('button', { name: /Suivant|Next/i }).click();

  await page.getByRole('button', { name: /Capot|Pare|Avant|Hood/i }).first().click();
  await page.getByRole('button', { name: /Suivant|Next/i }).click();
}

test.describe('Task Creation Smoke', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('creates a task through the wizard', async ({ page }) => {
    await goToScheduleStep(page);

    await page.locator('input[name="scheduled_date"]').fill(futureDate());
    await page.getByRole('button', { name: '09:00' }).click();
    await page.getByRole('button', { name: /Cr.{1,4}r la t.{1,3}che|Create task/i }).click();

    await expect(page).toHaveURL(/\/tasks\/[a-zA-Z0-9-]+/, { timeout: 45000 });
  });

  test('keeps submit disabled until schedule fields are completed', async ({ page }) => {
    await goToScheduleStep(page);

    const submitButton = page.getByRole('button', { name: /Cr.{1,4}r la t.{1,3}che|Create task/i });
    await expect(submitButton).toBeDisabled();

    await page.locator('input[name="scheduled_date"]').fill(futureDate());
    await page.getByRole('button', { name: '10:00' }).click();

    await expect(submitButton).toBeEnabled();
  });
});
