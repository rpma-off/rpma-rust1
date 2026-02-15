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
import { resetMockDb } from './utils/mock';

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
    // Login before each test
    await page.goto('/login');
    await resetMockDb(page);
    
    // Fill in login form (assuming test user exists)
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'testpassword');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to complete - try multiple possible URLs
    await Promise.race([
      page.waitForURL(/\/(dashboard|tasks|\/?$)/, { timeout: 10000 }),
      page.waitForSelector('text=Jobs', { timeout: 10000 }),
      page.waitForSelector('text=Clients', { timeout: 10000 })
    ]);
  });

  test('should create a new individual client with all required fields', async ({ page }) => {
    // Navigate to clients page
    await page.goto('/clients');
    await expect(page.locator('h1')).toContainText('Clients');
    
    // Click add client button
    await page.click('a[href="/clients/new"]');
    await expect(page.locator('h1')).toContainText('New Client');
    
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
    await expect(page).toHaveURL(/\/clients\/[a-zA-Z0-9-]+/);
    
    // Verify client details are displayed
    await expect(page.locator('h1')).toContainText(testClient.name);
    await expect(page.locator(`text=${testClient.email}`)).toBeVisible();
    await expect(page.locator(`text=${testClient.phone}`)).toBeVisible();
    await expect(page.locator(`text=Individual Client`)).toBeVisible();
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
    await expect(page.locator(`text=Business Client`)).toBeVisible();
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
    
    // Should show validation for customer type
    await expect(page.locator('input[name="customer_type"]')).toBeChecked({ checked: false });
  });

  test('should add vehicles to a client', async ({ page }) => {
    // First create a client
    await page.goto('/clients/new');
    await page.fill('input[name="name"]', testClient.name);
    await page.click('input[name="customer_type"][value="individual"]');
    await page.click('button[type="submit"]');
    
    // Wait for client detail page
    await page.waitForURL(/\/clients\/[a-zA-Z0-9-]+/);
    
    // Get client ID from URL
    const url = page.url();
    const clientId = url.split('/').pop();
    
    // Create a task with vehicle information for this client
    await page.goto(`/tasks/new?clientId=${clientId}`);
    
    // Fill in task form with vehicle information
    await page.fill('input[name="title"]', 'Test Task with Vehicle');
    // Find the option with the client name and select it
    const clientOption = page.locator(`select[name="client_id"] option:has-text("${testClient.name}")`);
    await page.selectOption('select[name="client_id"]', await clientOption.getAttribute('value'));
    await page.fill('input[name="vehicle_make"]', testVehicle.make);
    await page.fill('input[name="vehicle_model"]', testVehicle.model);
    await page.fill('input[name="vehicle_plate"]', testVehicle.plate);
    await page.fill('input[name="vin"]', testVehicle.vin);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Verify task was created with vehicle information
    await expect(page.locator('h1')).toContainText('Test Task with Vehicle');
    await expect(page.locator(`text=${testVehicle.make} ${testVehicle.model}`)).toBeVisible();
    await expect(page.locator(`text=${testVehicle.plate}`)).toBeVisible();
  });

  test('should update client information', async ({ page }) => {
    // First create a client
    await page.goto('/clients/new');
    await page.fill('input[name="name"]', testClient.name);
    await page.fill('input[name="email"]', testClient.email);
    await page.click('input[name="customer_type"][value="individual"]');
    await page.click('button[type="submit"]');
    
    // Wait for client detail page
    await page.waitForURL(/\/clients\/[a-zA-Z0-9-]+/);
    
    // Click edit button
    await page.click('button:has-text("Edit")');
    
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
      await page.waitForURL(/\/clients\/[a-zA-Z0-9-]+/);
      await page.goto('/clients'); // Go back to list for next creation
    }
    
    // Test search functionality
    await page.goto('/clients');
    await page.fill('input[placeholder="Rechercher par nom, email, entreprise..."]', 'Alice');
    await page.waitForTimeout(1000); // Wait for search to complete
    
    // Should only show Alice Smith
    await expect(page.locator('text=Alice Smith')).toBeVisible();
    await expect(page.locator('text=Bob Johnson')).not.toBeVisible();
    await expect(page.locator('text=Acme Corporation')).not.toBeVisible();
    
    // Clear search
    await page.fill('input[placeholder="Rechercher par nom, email, entreprise..."]', '');
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
    await page.waitForURL(/\/clients\/[a-zA-Z0-9-]+/);
    
    // Verify client overview section
    await expect(page.locator('text=Client Overview')).toBeVisible();
    await expect(page.locator('text=Total Tasks')).toBeVisible();
    await expect(page.locator('text=Completed')).toBeVisible();
    await expect(page.locator('text=Client Since')).toBeVisible();
    
    // Verify contact information section
    await expect(page.locator('text=Contact Information')).toBeVisible();
    await expect(page.locator(`text=${testClient.email}`)).toBeVisible();
    
    // Check for recent activity section
    await expect(page.locator('text=Recent Activity')).toBeVisible();
  });

  test('should handle data persistence across page refreshes', async ({ page }) => {
    // Create a client
    await page.goto('/clients/new');
    await page.fill('input[name="name"]', testClient.name);
    await page.fill('input[name="email"]', testClient.email);
    await page.click('input[name="customer_type"][value="individual"]');
    await page.click('button[type="submit"]');
    
    // Wait for client detail page
    await page.waitForURL(/\/clients\/[a-zA-Z0-9-]+/);
    
    // Refresh the page
    await page.reload();
    
    // Wait for page to load
    await expect(page.locator('h1')).toContainText(testClient.name);
    
    // Verify data is still present
    await expect(page.locator(`text=${testClient.email}`)).toBeVisible();
    await expect(page.locator(`text=Individual Client`)).toBeVisible();
    
    // Navigate back to clients list and verify client is still there
    await page.goto('/clients');
    await expect(page.locator(`text=${testClient.name}`)).toBeVisible();
  });

  test('should handle client deletion with confirmation', async ({ page }) => {
    // Create a client first
    await page.goto('/clients/new');
    await page.fill('input[name="name"]', 'Client to Delete');
    await page.click('input[name="customer_type"][value="individual"]');
    await page.click('button[type="submit"]');
    
    // Wait for client detail page
    await page.waitForURL(/\/clients\/[a-zA-Z0-9-]+/);
    
    // Click delete button
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain('Êtes-vous sûr de vouloir supprimer');
      dialog.accept();
    });
    
    await page.click('button:has-text("Delete")');
    
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
      await page.waitForURL(/\/clients\/[a-zA-Z0-9-]+/);
      await page.goto('/clients');
    }
    
    // Navigate to first client
    await page.click(`text=${clientNames[0]}`);
    await page.waitForURL(/\/clients\/[a-zA-Z0-9-]+/);
    
    // Verify client details
    await expect(page.locator('h1')).toContainText(clientNames[0]);
    
    // Navigate back to list
    await page.click('a[href="/clients"]');
    await expect(page).toHaveURL('/clients');
    
    // Navigate to second client
    await page.click(`text=${clientNames[1]}`);
    await page.waitForURL(/\/clients\/[a-zA-Z0-9-]+/);
    
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
      await page.waitForURL(/\/clients\/[a-zA-Z0-9-]+/);
      await page.goto('/clients');
    }
    
    // Test sorting by name A-Z
    await page.selectOption('select', 'name_asc');
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
    await page.selectOption('select', 'name_desc');
    await page.waitForTimeout(1000);
  });
});
