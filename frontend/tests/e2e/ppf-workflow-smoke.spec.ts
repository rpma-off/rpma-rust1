import { test, expect } from '@playwright/test';
import { resetMockDb } from './utils/mock';

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAEklEQVR42mP8z8BQDwAFgwJ/lYgI8wAAAABJRU5ErkJggg==';

const photoPayload = (name: string) => ({
  name,
  mimeType: 'image/png',
  buffer: Buffer.from(PNG_BASE64, 'base64'),
});

test('ppf workflow smoke: draft + validate unlocks next step', async ({ page }) => {
  test.setTimeout(180000);
  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await resetMockDb(page);

  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'testpassword');
  await page.click('button[type="submit"]');
  await page.waitForURL('/', { timeout: 10000 });

  await page.goto('/tasks/task-1/workflow/ppf');
  await expect(page.getByText('Workflow PPF')).toBeVisible();

  await page.getByRole('button', { name: /Commencer/i }).first().click();
  await expect(page.getByText('Inspection du véhicule')).toBeVisible();

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
