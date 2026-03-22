import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './utils/auth';

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAEklEQVR42mP8z8BQDwAFgwJ/lYgI8wAAAABJRU5ErkJggg==';

const photoPayload = (name: string) => ({
  name,
  mimeType: 'image/png',
  buffer: Buffer.from(PNG_BASE64, 'base64'),
});

test('ppf workflow smoke: draft + validate unlocks next step', async ({ page }) => {
  test.setTimeout(180000);
  
  // Use the shared login helper which handles mock initialization
  await loginAsTestUser(page);

  // Navigate to PPF workflow and wait for page to fully load
  await page.goto('/tasks/task-1/workflow/ppf', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 });

  // Wait for the workflow header to be visible with extended timeout
  // The header includes emoji and vehicle info: "🛡 Workflow PPF — Tesla Model 3"
  // Also wait for task data to load
  await expect(page.getByText(/Workflow PPF|PPF/i).first()).toBeVisible({ timeout: 20000 });

  await page.getByRole('button', { name: /Commencer/i }).first().click();
  // Wait for navigation to inspection step (page needs compilation on first visit)
  await page.waitForURL(/\/tasks\/task-1\/workflow\/ppf\/steps\/inspection/, { timeout: 30000 });
  await expect(page.getByText('Inspection du véhicule')).toBeVisible({ timeout: 15000 });

  const checklistLabels = [
    'Véhicule propre et sec',
    'Température confirmée 18-25°C',
    'Humidité 40-60% vérifiée',
    'Défauts pré-existants documentés',
    'Film PPF sélectionné et disponible',
    'Client informé des consignes post-pose',
  ];

  for (const label of checklistLabels) {
    await page.getByText(label).click();
  }

  const uploadInput = page.locator('input[type="file"]').first();
  await uploadInput.setInputFiles([
    photoPayload('photo-1.png'),
    photoPayload('photo-2.png'),
    photoPayload('photo-3.png'),
    photoPayload('photo-4.png'),
  ]);

  await expect(page.getByText('4 / 4 photos')).toBeVisible();

  await page.getByRole('button', { name: /Sauvegarder brouillon/i }).click();

  const validateButton = page.getByRole('button', { name: /Valider Inspection/i });
  await expect(validateButton).toBeEnabled();
  await validateButton.click();

  await page.waitForURL(/\/tasks\/task-1\/workflow\/ppf\/steps\/preparation/);
  await expect(page.getByText('Préparation de surface')).toBeVisible();
});
