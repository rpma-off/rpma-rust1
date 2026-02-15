import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './utils/auth';

async function fillVehicleFields(page: import('@playwright/test').Page) {
  await page.goto('/tasks/new');

  await page.locator('input[name="vehicle_plate"]').fill('AB123CD');
  await page.locator('input[name="vehicle_make"]').fill('Tesla');
  await page.locator('input[name="vehicle_model"]').fill('Model 3');
  await page.locator('input[name="vehicle_year"]').fill('2024');
}

test.describe('Task Creation Smoke', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('opens task creation flow and enables next after vehicle inputs', async ({ page }) => {
    await fillVehicleFields(page);
    await expect(page.getByRole('button', { name: /Suivant|Next/i })).toBeEnabled();
  });

  test('keeps next disabled until required vehicle fields are completed', async ({ page }) => {
    await page.goto('/tasks/new');

    const nextButton = page.getByRole('button', { name: /Suivant|Next/i });
    await expect(nextButton).toBeDisabled();

    await fillVehicleFields(page);
    await expect(nextButton).toBeEnabled();
  });
});
