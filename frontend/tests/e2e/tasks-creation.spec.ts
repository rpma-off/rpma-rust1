import { test, expect } from '@playwright/test';

test.describe('Task Creation Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    
    // Fill in login form (assuming test user exists)
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'testpassword');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to complete
    await page.waitForURL('/', { timeout: 10000 });
  });

  test('should create a new task successfully', async ({ page }) => {
    // Navigate to tasks page
    await page.goto('/tasks');
    
    // Wait for tasks page to load
    await expect(page.locator('h1')).toContainText('Jobs');
    
    // Click the "Add" button (floating action button)
    await page.click('button:has-text("Add")');
    
    // Wait for navigation to new task page
    await page.waitForURL('/tasks/new');
    
    // Fill in the task form with valid data
    await page.fill('input[name="title"]', 'Test PPF Intervention');
    await page.fill('textarea[name="description"]', 'This is a test PPF intervention created by E2E test');
    
    // Select a client (assuming client data is pre-loaded)
    await page.selectOption('select[name="client_id"]', { label: 'Client A' });
    
    // Set priority to high
    await page.selectOption('select[name="priority"]', 'high');
    
    // Set scheduled date
    await page.fill('input[name="scheduled_date"]', '2024-12-15');
    
    // Fill in vehicle information
    await page.fill('input[name="vehicle_make"]', 'Tesla');
    await page.fill('input[name="vehicle_model"]', 'Model 3');
    await page.fill('input[name="vehicle_plate"]', 'ABC-123');
    
    // Fill in VIN
    await page.fill('input[name="vin"]', '5YJ3E1EA1JF000001');
    
    // Set estimated duration
    await page.fill('input[name="estimated_duration"]', '4');
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Verify task was created (should redirect to task detail or tasks list)
    await expect(page).toHaveURL(/\/tasks\/[a-zA-Z0-9-]+/); // Task detail page
    
    // Verify task details are displayed
    await expect(page.locator('h1')).toContainText('Test PPF Intervention');
    await expect(page.locator('text=Tesla Model 3')).toBeVisible();
    await expect(page.locator('text=ABC-123')).toBeVisible();
  });

  test('should show validation errors for required fields', async ({ page }) => {
    // Navigate to new task page directly
    await page.goto('/tasks/new');
    
    // Submit form without filling required fields
    await page.click('button[type="submit"]');
    
    // Check for validation errors
    await expect(page.locator('text=Le titre est requis')).toBeVisible();
    await expect(page.locator('text=Le client est requis')).toBeVisible();
  });

  test('should save task as draft when save button is clicked', async ({ page }) => {
    // Navigate to tasks page
    await page.goto('/tasks');
    
    // Click the "Add" button
    await page.click('button:has-text("Add")');
    
    // Wait for new task page
    await page.waitForURL('/tasks/new');
    
    // Fill in only required fields
    await page.fill('input[name="title"]', 'Draft Task Test');
    await page.selectOption('select[name="client_id"]', { label: 'Client A' });
    
    // Click save draft button (if exists) or regular submit
    const saveDraftButton = page.locator('button:has-text("Enregistrer brouillon")');
    if (await saveDraftButton.isVisible()) {
      await saveDraftButton.click();
    } else {
      await page.click('button[type="submit"]');
    }
    
    // Verify task was saved and has draft status
    await expect(page.locator('.badge:has-text("Brouillon")')).toBeVisible();
  });

  test('should cancel task creation and return to tasks list', async ({ page }) => {
    // Navigate to tasks page
    await page.goto('/tasks');
    
    // Click the "Add" button
    await page.click('button:has-text("Add")');
    
    // Wait for new task page
    await page.waitForURL('/tasks/new');
    
    // Fill in some data
    await page.fill('input[name="title"]', 'Task to be cancelled');
    
    // Click cancel button
    const cancelButton = page.locator('button:has-text("Annuler"), button:has-text("Cancel")');
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
      
      // Should return to tasks list
      await expect(page).toHaveURL('/tasks');
      
      // Verify the task was not created
      await expect(page.locator('text=Task to be cancelled')).not.toBeVisible();
    } else {
      // Test alternative: navigate back
      await page.goBack();
      await expect(page).toHaveURL('/tasks');
    }
  });

  test('should handle PPF zones selection', async ({ page }) => {
    // Navigate to new task page
    await page.goto('/tasks/new');
    
    // Fill in required fields
    await page.fill('input[name="title"]', 'PPF Zones Test');
    await page.selectOption('select[name="client_id"]', { label: 'Client A' });
    
    // Look for PPF zones section and select some zones
    const hoodCheckbox = page.locator('input[name="ppf_zones[]"][value="hood"]');
    if (await hoodCheckbox.isVisible()) {
      await hoodCheckbox.check();
      
      const fendersCheckbox = page.locator('input[name="ppf_zones[]"][value="fenders"]');
      if (await fendersCheckbox.isVisible()) {
        await fendersCheckbox.check();
      }
    }
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Verify PPF zones are displayed in the created task
    await expect(page.locator('text=Hood')).toBeVisible();
    await expect(page.locator('text=Fenders')).toBeVisible();
  });

  test('should upload and display task photo', async ({ page }) => {
    // Navigate to new task page
    await page.goto('/tasks/new');
    
    // Fill in required fields
    await page.fill('input[name="title"]', 'Task with Photo');
    await page.selectOption('select[name="client_id"]', { label: 'Client A' });
    
    // Look for photo upload section
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.isVisible()) {
      // Upload a test file
      await fileInput.setInputFiles('test-assets/sample-photo.jpg');
      
      // Wait for upload to complete and preview to show
      await expect(page.locator('img[alt*="preview"]')).toBeVisible({ timeout: 5000 });
    }
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Verify photo is displayed in task details
    await expect(page.locator('img[alt*="task photo"]')).toBeVisible();
  });
});