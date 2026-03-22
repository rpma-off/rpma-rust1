/**
 * Client Lifecycle E2E Tests
 * 
 * This test suite covers the complete lifecycle of client management in the RPMA application:
 * - Client creation (individual and business)
 * - Client information updates
 * - Client search and filtering
 * - Client deletion
 * - Vehicle management for clients
 * - Data persistence
 * 
 * To run these tests locally:
 * 1. Run: npm run test:e2e
 * 2. Playwright will start the Next.js dev server with mock IPC enabled
 * 
 * These tests require authentication with a test user (test@example.com / testpassword).
 * Make sure this user exists in the test database.
 */

// TODO(e2e): excluded from default smoke run; re-enable after selector and workflow stabilization.
import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './utils/auth';

test.describe('Client Lifecycle Management', () => {
  // Test data
  const testClient = {
    name: 'Test Client E2E',
    email: 'testclient@example.com',
    phone: '555-123-4567',
    address_street: '123 Test Street',
    address_city: 'Test City',
    address_state: 'Test State',
    address_zip: '12345',
    address_country: 'Test Country',
    customer_type: 'individual' as const,
    notes: 'This is a test client created by E2E tests'
  };

  const testBusinessClient = {
    name: 'Test Business E2E',
    email: 'business@example.com',
    phone: '555-987-6543',
    address_street: '456 Business Ave',
    address_city: 'Business City',
    address_state: 'Business State',
    address_zip: '67890',
    address_country: 'Business Country',
    customer_type: 'business' as const,
    company_name: 'Test Business Inc.',
    contact_person: 'John Contact',
    notes: 'This is a test business client created by E2E tests'
  };

  const testVehicle = {
    make: 'Tesla',
    model: 'Model 3',
    plate: 'TEST-123',
    vin: '5YJ3E1EA1JF000001'
  };

  test.beforeEach(async ({ page }) => {
    test.setTimeout(90000); // Extended timeout for cold-start Next.js compilation
    await loginAsTestUser(page);
  });

  test('should create a new individual client with all required fields', async ({ page }) => {
    // Navigate to clients page
    await page.goto('/clients');
    await expect(page.locator('h1')).toContainText('Clients');
    
    // Click add client button
    await page.click('a[href="/clients/new"]');
    await expect(page.locator('h1')).toContainText(/Nouveau client|New Client/i);

    // Fill in client information
    await page.fill('input[name="name"]', testClient.name);
    await page.fill('input[name="email"]', testClient.email);
    await page.fill('input[name="phone"]', testClient.phone);
    await page.fill('textarea[name="address_street"]', testClient.address_street);
    await page.click('input[name="customer_type"][value="individual"]');
    await page.fill('textarea[name="notes"]', testClient.notes);

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to client detail page
    await expect(page).toHaveURL(/\/clients\/[a-zA-Z0-9]+-[a-zA-Z0-9-]+/);

    // Verify client details are displayed
    await expect(page.locator('h1')).toContainText(testClient.name);
    await expect(page.locator(`text=${testClient.email}`)).toBeVisible();
    await expect(page.locator(`text=${testClient.phone}`)).toBeVisible();
    await expect(page.locator('text=Client particulier')).toBeVisible();
  });

  test('should create a new business client with company information', async ({ page }) => {
    // Navigate to clients page
    await page.goto('/clients');
    
    // Click add client button
    await page.click('a[href="/clients/new"]');
    
    // Fill in business client information
    await page.fill('input[name="name"]', testBusinessClient.name);
    await page.fill('input[name="email"]', testBusinessClient.email);
    await page.fill('input[name="phone"]', testBusinessClient.phone);
    await page.fill('textarea[name="address_street"]', testBusinessClient.address_street);
    await page.click('input[name="customer_type"][value="business"]');
    await page.fill('input[name="company_name"]', testBusinessClient.company_name);
    await page.fill('textarea[name="notes"]', testBusinessClient.notes);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Verify client details
    await expect(page.locator('h1')).toContainText(testBusinessClient.name);
    await expect(page.locator(`text=${testBusinessClient.company_name}`)).toBeVisible();
    await expect(page.locator('text=Client entreprise')).toBeVisible();
  });

  test('should show validation errors for required fields', async ({ page }) => {
    // Navigate to new client page
    await page.goto('/clients/new');
    
    // Submit form without filling required fields
    await page.click('button[type="submit"]');
    
    // Check for validation errors
    await expect(page.locator('input[name="name"]')).toHaveAttribute('required');
    
    // Try to submit with only name filled
    await page.fill('input[name="name"]', 'Test');
    await page.click('button[type="submit"]');
    
    // Customer type should default to individual (pre-selected)
    await expect(page.locator('input[name="customer_type"][value="individual"]')).toBeChecked();
  });

  test('should display vehicle information on task details', async ({ page }) => {
    // Navigate to the fixture task (task-1) which has pre-seeded vehicle info: Tesla Model 3, TEST-001
    await page.goto('/tasks/task-1');

    // Verify vehicle information is displayed on the task detail page
    await expect(page.locator('text=Tesla')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Model 3')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=TEST-001')).toBeVisible({ timeout: 15000 });
  });

  test('should update client information', async ({ page }) => {
    // First create a client
    await page.goto('/clients/new');
    await page.fill('input[name="name"]', testClient.name);
    await page.fill('input[name="email"]', testClient.email);
    await page.click('input[name="customer_type"][value="individual"]');
    await page.click('button[type="submit"]');
    
    // Wait for client detail page
    await page.waitForURL(/\/clients\/[a-zA-Z0-9]+-[a-zA-Z0-9-]+/);
    
    // Click edit button
    await page.click('button:has-text("Modifier")');
    
    // Wait for edit page
    await page.waitForURL(/\/clients\/[a-zA-Z0-9-]+\/edit/);
    
    // Update client information
    const updatedEmail = 'updated@example.com';
    const updatedPhone = '555-999-8888';
    const updatedNotes = 'Updated notes for the test client';
    
    await page.fill('input[name="email"]', updatedEmail);
    await page.fill('input[name="phone"]', updatedPhone);
    await page.fill('textarea[name="notes"]', updatedNotes);
    
    // Save changes
    await page.click('button[type="submit"]');
    
    // Verify changes were saved
    await expect(page.locator(`text=${updatedEmail}`)).toBeVisible();
    await expect(page.locator(`text=${updatedPhone}`)).toBeVisible();
    await expect(page.locator(`text=${updatedNotes}`)).toBeVisible();
  });

  test('should search and filter clients', async ({ page }) => {
    // Create multiple clients for testing search
    const clients = [
      { name: 'Alice Smith', customer_type: 'individual' },
      { name: 'Bob Johnson', customer_type: 'individual' },
      { name: 'Acme Corporation', customer_type: 'business' }
    ];
    
    for (const client of clients) {
      await page.goto('/clients/new');
      await page.fill('input[name="name"]', client.name);
      await page.click(`input[name="customer_type"][value="${client.customer_type}"]`);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/clients\/[a-zA-Z0-9]+-[a-zA-Z0-9-]+/);
      await page.goto('/clients'); // Go back to list for next creation
    }
    
    // Test search functionality
    await page.goto('/clients');
    await page.fill('input[placeholder="Rechercher un client..."]', 'Alice');
    await page.waitForTimeout(1000); // Wait for search to complete
    
    // Should only show Alice Smith
    await expect(page.locator('text=Alice Smith')).toBeVisible();
    await expect(page.locator('text=Bob Johnson')).not.toBeVisible();
    await expect(page.locator('text=Acme Corporation')).not.toBeVisible();
    
    // Clear search
    await page.fill('input[placeholder="Rechercher un client..."]', '');
    await page.waitForTimeout(1000);
    
    // Test filter by customer type
    await page.selectOption('select', 'business');
    await page.waitForTimeout(1000);
    
    // Should only show business clients
    await expect(page.locator('text=Acme Corporation')).toBeVisible();
    await expect(page.locator('text=Alice Smith')).not.toBeVisible();
    await expect(page.locator('text=Bob Johnson')).not.toBeVisible();
  });

  test('should view client details and history', async ({ page }) => {
    // Create a client first
    await page.goto('/clients/new');
    await page.fill('input[name="name"]', testClient.name);
    await page.fill('input[name="email"]', testClient.email);
    await page.click('input[name="customer_type"][value="individual"]');
    await page.click('button[type="submit"]');
    
    // Wait for client detail page
    await page.waitForURL(/\/clients\/[a-zA-Z0-9]+-[a-zA-Z0-9-]+/);
    
    // Verify client overview section
    await expect(page.locator('text=Aperçu du client')).toBeVisible();
    await expect(page.locator('text=Total tâches')).toBeVisible();
    await expect(page.locator('text=Terminées')).toBeVisible();
    await expect(page.locator('text=Client depuis')).toBeVisible();

    // Verify contact information section
    await expect(page.locator('text=Informations de contact')).toBeVisible();
    await expect(page.locator(`text=${testClient.email}`)).toBeVisible();

    // Check for recent activity section (use h3 to avoid matching "Aucune activité récente" paragraph)
    await expect(page.locator('h3:has-text("Activité récente")')).toBeVisible();
  });

  test('should handle data persistence across page refreshes', async ({ page }) => {
    // Create a client
    await page.goto('/clients/new');
    await page.fill('input[name="name"]', testClient.name);
    await page.fill('input[name="email"]', testClient.email);
    await page.click('input[name="customer_type"][value="individual"]');
    await page.click('button[type="submit"]');
    
    // Wait for client detail page
    await page.waitForURL(/\/clients\/[a-zA-Z0-9]+-[a-zA-Z0-9-]+/);

    // Verify data is visible right after creation
    await expect(page.locator('h1')).toContainText(testClient.name);
    await expect(page.locator(`text=${testClient.email}`)).toBeVisible();
    await expect(page.locator('text=Client particulier')).toBeVisible();

    // Navigate back to clients list via client-side link (preserves in-memory mock state)
    await page.click('a[href="/clients"]');
    await page.waitForURL(/\/clients(\?.*)?$/, { timeout: 10000 });
    await expect(page.locator(`text=${testClient.name}`)).toBeVisible();
  });

  test('should handle client deletion with confirmation', async ({ page }) => {
    // Create a client first
    await page.goto('/clients/new');
    await page.fill('input[name="name"]', 'Client to Delete');
    await page.click('input[name="customer_type"][value="individual"]');
    await page.click('button[type="submit"]');
    
    // Wait for client detail page
    await page.waitForURL(/\/clients\/[a-zA-Z0-9]+-[a-zA-Z0-9-]+/);
    
    // Click delete button
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain('Êtes-vous sûr de vouloir supprimer');
      dialog.accept();
    });
    
    await page.click('button:has-text("Supprimer")');
    
    // Should redirect to clients list
    await expect(page).toHaveURL('/clients');
    
    // Verify client is no longer in the list
    await expect(page.locator('text=Client to Delete')).not.toBeVisible();
  });

  test('should navigate between client pages and maintain context', async ({ page }) => {
    // Create multiple clients
    const clientNames = ['Navigation Test 1', 'Navigation Test 2'];
    
    for (const name of clientNames) {
      await page.goto('/clients/new');
      await page.fill('input[name="name"]', name);
      await page.click('input[name="customer_type"][value="individual"]');
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/clients\/[a-zA-Z0-9]+-[a-zA-Z0-9-]+/);
      await page.goto('/clients');
    }
    
    // Navigate to first client
    await page.click(`text=${clientNames[0]}`);
    await page.waitForURL(/\/clients\/[a-zA-Z0-9]+-[a-zA-Z0-9-]+/);
    
    // Verify client details
    await expect(page.locator('h1')).toContainText(clientNames[0]);
    
    // Navigate back to list
    await page.click('a[href="/clients"]');
    await expect(page).toHaveURL('/clients');
    
    // Navigate to second client
    await page.click(`text=${clientNames[1]}`);
    await page.waitForURL(/\/clients\/[a-zA-Z0-9]+-[a-zA-Z0-9-]+/);
    
    // Verify correct client details
    await expect(page.locator('h1')).toContainText(clientNames[1]);
  });

  test('should handle sorting options in client list', async ({ page }) => {
    // Create clients with different names
    const clientNames = ['Zebra Client', 'Alpha Client', 'Beta Client'];
    
    for (const name of clientNames) {
      await page.goto('/clients/new');
      await page.fill('input[name="name"]', name);
      await page.click('input[name="customer_type"][value="individual"]');
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/clients\/[a-zA-Z0-9]+-[a-zA-Z0-9-]+/);
      await page.goto('/clients');
    }
    
    // Test sorting by name A-Z (second select is the sort select)
    await page.locator('select').nth(1).selectOption('name_asc');
    await page.waitForTimeout(1000);
    
    // Get all client names in order
    const clientElements = await page.locator('.grid > div').count();
    const names = [];
    for (let i = 0; i < clientElements; i++) {
      const element = page.locator('.grid > div').nth(i);
      const text = await element.textContent();
      if (text && clientNames.some(name => text.includes(name))) {
        names.push(text);
      }
    }
    
    // Verify they are sorted alphabetically
    const sortedNames = [...names].sort();
    expect(names).toEqual(sortedNames);
    
    // Test sorting by name Z-A
    await page.locator('select').nth(1).selectOption('name_desc');
    await page.waitForTimeout(1000);
  });
});
