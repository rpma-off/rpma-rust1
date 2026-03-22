import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './utils/auth';

async function fillVehicleFields(page: import('@playwright/test').Page) {
  // Navigate to task creation page with load event for stability
  await page.goto('/tasks/new', { waitUntil: 'load', timeout: 60000 });

  // Wait for the form to load (it's dynamically imported) - extended timeout
  await page.waitForSelector('input[name="vehicle_plate"]', { state: 'visible', timeout: 20000 });

  // Small delay to ensure form is fully interactive
  await page.waitForTimeout(500);

  await page.locator('input[name="vehicle_plate"]').fill('AB123CD');
  await page.locator('input[name="vehicle_make"]').fill('Tesla');
  await page.locator('input[name="vehicle_model"]').fill('Model 3');
  await page.locator('input[name="vehicle_year"]').fill('2024');
}

test.describe.configure({ mode: 'serial' });

test.describe('Task Creation Smoke', () => {
  test.beforeEach(async ({ page }) => {
    // Increase timeout for beforeEach hook + /tasks/new compilation (~53s)
    test.setTimeout(120000);
    // loginAsTestUser handles mock initialization and navigation
    await loginAsTestUser(page);
  });

  test('opens task creation flow and enables next after vehicle inputs', async ({ page }) => {
    await fillVehicleFields(page);
    await expect(page.getByRole('button', { name: /Valider.*étape|Suivant|Next/i })).toBeEnabled();
  });

  test('keeps next disabled until required vehicle fields are completed', async ({ page }) => {
    // Navigate to task creation page with load event for stability
    await page.goto('/tasks/new', { waitUntil: 'load', timeout: 60000 });

    // Wait for the form to load - extended timeout for dynamic import
    await page.waitForSelector('input[name="vehicle_plate"]', { state: 'visible', timeout: 20000 });

    const nextButton = page.getByRole('button', { name: /Valider.*étape|Suivant|Next/i });
    await expect(nextButton).toBeDisabled();

    await fillVehicleFields(page);
    await expect(nextButton).toBeEnabled();
  });
});
