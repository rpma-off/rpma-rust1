import { test, expect } from '@playwright/test';

// Test data fixtures
const TEST_MATERIALS = {
  valid: {
    sku: 'E2E-INV-TEST-001',
    name: 'E2E Test Inventory Material',
    description: 'Test material for E2E inventory testing',
    material_type: 'ppf_film',
    unit_of_measure: 'meter',
    current_stock: '100',
    minimum_stock: '20',
    maximum_stock: '500',
    unit_cost: '15.50',
    reorder_point: '25'
  },
  duplicate: {
    sku: 'E2E-INV-DUP-001',
    name: 'Duplicate Test Material',
    material_type: 'ppf_film',
    unit_of_measure: 'meter'
  },
  invalid: {
    sku: '',
    name: '',
    material_type: '',
    unit_of_measure: ''
  }
};

const TEST_SUPPLIER = {
  name: 'E2E Test Supplier',
  email: 'supplier-e2e@example.com',
  phone: '+1-555-0123',
  address_city: 'Test City'
};

const TEST_CATEGORY = {
  name: 'E2E Test Category',
  code: 'E2E-CAT',
  description: 'Test category for E2E testing'
};

test.describe('Inventory Management', () => {
  // Track created materials for cleanup
  let createdMaterials: string[] = [];
  let createdSuppliers: string[] = [];
  let createdCategories: string[] = [];

  test.beforeAll(async ({ playwright }) => {
    // Check if frontend server is running (Tauri serves frontend on different port)
    try {
      const request = await playwright.request.newContext();
      const response = await request.get('http://localhost:1420', { timeout: 5000 });
      if (!response.ok()) {
        throw new Error('Frontend server is not responding correctly');
      }
    } catch (error) {
      throw new Error(
        'Frontend server is not running at http://localhost:1420. Please start with "npm run tauri dev" before running these tests.'
      );
    }
  });

  // Authentication before each test
  test.beforeEach(async ({ page }) => {
    // Note: These tests require:
    // 1. Start Tauri with: npm run tauri dev
    // 2. Then run: npx playwright test inventory-management.spec.ts
    
    // Navigate to login page
    await page.goto('/login');
    
    // Fill in login form with admin user for inventory permissions
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'adminpassword');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('/dashboard');
    
    // Navigate to inventory management page
    await page.click('text=Inventory');
    await page.waitForURL('/inventory');
    await page.waitForLoadState('networkidle');
  });

  // Cleanup after each test
  test.afterEach(async ({ page }) => {
    // Delete created materials
    for (const materialId of createdMaterials) {
      try {
        await page.goto(`/inventory/material/${materialId}`);
        await page.waitForLoadState('networkidle');
        
        // Click delete button
        await page.click('button[aria-label="Delete material"]');
        
        // Confirm deletion in modal
        await page.waitForSelector('[role="dialog"]');
        await page.click('button:has-text("Delete")');
        
        // Wait for deletion to complete
        await page.waitForSelector('text=Material deleted successfully', { timeout: 5000 });
      } catch (error) {
        console.log(`Failed to delete material ${materialId}:`, error);
      }
    }
    
    // Delete created suppliers
    for (const supplierId of createdSuppliers) {
      try {
        await page.goto(`/inventory/suppliers/${supplierId}`);
        await page.waitForLoadState('networkidle');
        
        // Click delete button
        await page.click('button[aria-label="Delete supplier"]');
        
        // Confirm deletion in modal
        await page.waitForSelector('[role="dialog"]');
        await page.click('button:has-text("Delete")');
        
        // Wait for deletion to complete
        await page.waitForSelector('text=Supplier deleted successfully', { timeout: 5000 });
      } catch (error) {
        console.log(`Failed to delete supplier ${supplierId}:`, error);
      }
    }
    
    // Delete created categories
    for (const categoryId of createdCategories) {
      try {
        await page.goto(`/inventory/categories/${categoryId}`);
        await page.waitForLoadState('networkidle');
        
        // Click delete button
        await page.click('button[aria-label="Delete category"]');
        
        // Confirm deletion in modal
        await page.waitForSelector('[role="dialog"]');
        await page.click('button:has-text("Delete")');
        
        // Wait for deletion to complete
        await page.waitForSelector('text=Category deleted successfully', { timeout: 5000 });
      } catch (error) {
        console.log(`Failed to delete category ${categoryId}:`, error);
      }
    }
    
    // Reset arrays
    createdMaterials = [];
    createdSuppliers = [];
    createdCategories = [];
  });

  test('should display inventory dashboard with stats', async ({ page }) => {
    // Check for dashboard stats
    await expect(page.locator('text=Total Materials')).toBeVisible();
    await expect(page.locator('text=Active Materials')).toBeVisible();
    await expect(page.locator('text=Low Stock')).toBeVisible();
    await expect(page.locator('text=Expired Materials')).toBeVisible();
    
    // Check for materials table
    await expect(page.locator('table[aria-label="Materials"]')).toBeVisible();
    
    // Check for action buttons
    await expect(page.locator('button:has-text("Add Material")')).toBeVisible();
    await expect(page.locator('button[aria-label="Refresh inventory"]')).toBeVisible();
  });

  test('should create a new material successfully', async ({ page }) => {
    // Click Add Material button
    await page.click('button:has-text("Add Material")');
    
    // Wait for modal to open
    await page.waitForSelector('[role="dialog"]');
    
    // Fill in material form
    await page.fill('input[name="sku"]', TEST_MATERIALS.valid.sku);
    await page.fill('input[name="name"]', TEST_MATERIALS.valid.name);
    await page.fill('textarea[name="description"]', TEST_MATERIALS.valid.description);
    
    // Select material type
    await page.click('select[name="material_type"]');
    await page.click(`option:has-text("${TEST_MATERIALS.valid.material_type}")`);
    
    // Select unit of measure
    await page.click('select[name="unit_of_measure"]');
    await page.click(`option:has-text("${TEST_MATERIALS.valid.unit_of_measure}")`);
    
    // Fill in stock information
    await page.fill('input[name="current_stock"]', TEST_MATERIALS.valid.current_stock);
    await page.fill('input[name="minimum_stock"]', TEST_MATERIALS.valid.minimum_stock);
    await page.fill('input[name="maximum_stock"]', TEST_MATERIALS.valid.maximum_stock);
    await page.fill('input[name="reorder_point"]', TEST_MATERIALS.valid.reorder_point);
    
    // Fill in cost information
    await page.fill('input[name="unit_cost"]', TEST_MATERIALS.valid.unit_cost);
    
    // Submit form
    await page.click('button:has-text("Save Material")');
    
    // Wait for success message
    await expect(page.locator('text=Material created successfully')).toBeVisible({ timeout: 5000 });
    
    // Verify material appears in list
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator(`text=${TEST_MATERIALS.valid.sku}`)).toBeVisible();
    
    // Store created material ID for cleanup
    const materialRow = page.locator(`table tr:has-text("${TEST_MATERIALS.valid.sku}")`);
    const materialId = await materialRow.getAttribute('data-material-id');
    if (materialId) {
      createdMaterials.push(materialId);
    }
  });

  test('should show validation errors for invalid material data', async ({ page }) => {
    // Click Add Material button
    await page.click('button:has-text("Add Material")');
    
    // Wait for modal to open
    await page.waitForSelector('[role="dialog"]');
    
    // Submit empty form
    await page.click('button:has-text("Save Material")');
    
    // Check for validation errors
    await expect(page.locator('text=SKU is required')).toBeVisible();
    await expect(page.locator('text=Material name is required')).toBeVisible();
    await expect(page.locator('text=Material type is required')).toBeVisible();
    
    // Close modal without saving
    await page.click('button:has-text("Cancel")');
  });

  test('should update an existing material', async ({ page }) => {
    // First create a material to update
    await page.click('button:has-text("Add Material")');
    await page.waitForSelector('[role="dialog"]');
    
    await page.fill('input[name="sku"]', TEST_MATERIALS.duplicate.sku);
    await page.fill('input[name="name"]', TEST_MATERIALS.duplicate.name);
    await page.click('select[name="material_type"]');
    await page.click(`option:has-text("${TEST_MATERIALS.duplicate.material_type}")`);
    await page.click('select[name="unit_of_measure"]');
    await page.click(`option:has-text("${TEST_MATERIALS.duplicate.unit_of_measure}")`);
    await page.fill('input[name="current_stock"]', '50');
    
    await page.click('button:has-text("Save Material")');
    await expect(page.locator('text=Material created successfully')).toBeVisible({ timeout: 5000 });
    
    // Get material ID for cleanup
    const materialRow = page.locator(`table tr:has-text("${TEST_MATERIALS.duplicate.sku}")`);
    const materialId = await materialRow.getAttribute('data-material-id');
    if (materialId) {
      createdMaterials.push(materialId);
    }
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Find and click edit button for created material
    await page.locator(`table tr:has-text("${TEST_MATERIALS.duplicate.sku}")`).locator('button[aria-label="Edit material"]').click();
    
    // Wait for edit modal to open
    await page.waitForSelector('[role="dialog"]');
    
    // Update material name
    await page.fill('input[name="name"]', 'Updated ' + TEST_MATERIALS.duplicate.name);
    
    // Update stock
    await page.fill('input[name="current_stock"]', '75');
    
    // Submit changes
    await page.click('button:has-text("Save Changes")');
    
    // Wait for success message
    await expect(page.locator('text=Material updated successfully')).toBeVisible({ timeout: 5000 });
    
    // Verify changes
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Updated ' + TEST_MATERIALS.duplicate.name)).toBeVisible();
  });

  test('should delete a material', async ({ page }) => {
    // First create a material to delete
    await page.click('button:has-text("Add Material")');
    await page.waitForSelector('[role="dialog"]');
    
    await page.fill('input[name="sku"]', 'E2E-DEL-001');
    await page.fill('input[name="name"]', 'Material to Delete');
    await page.click('select[name="material_type"]');
    await page.click('option:has-text("ppf_film")');
    await page.click('select[name="unit_of_measure"]');
    await page.click('option:has-text("meter")');
    
    await page.click('button:has-text("Save Material")');
    await expect(page.locator('text=Material created successfully')).toBeVisible({ timeout: 5000 });
    
    // Get material ID for cleanup
    const materialRow = page.locator('table tr:has-text("Material to Delete")');
    const materialId = await materialRow.getAttribute('data-material-id');
    if (materialId) {
      createdMaterials.push(materialId);
    }
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Find and click delete button for created material
    await page.locator('table tr:has-text("Material to Delete")').locator('button[aria-label="Delete material"]').click();
    
    // Wait for confirmation modal
    await page.waitForSelector('[role="dialog"]');
    await expect(page.locator('text=Are you sure you want to delete this material?')).toBeVisible();
    
    // Confirm deletion
    await page.click('button:has-text("Delete")');
    
    // Wait for success message
    await expect(page.locator('text=Material deleted successfully')).toBeVisible({ timeout: 5000 });
    
    // Verify material is no longer in list
    await expect(page.locator('text=Material to Delete')).not.toBeVisible();
  });

  test('should manage material stock levels', async ({ page }) => {
    // Create a material first
    await page.click('button:has-text("Add Material")');
    await page.waitForSelector('[role="dialog"]');
    
    await page.fill('input[name="sku"]', 'E2E-STOCK-001');
    await page.fill('input[name="name"]', 'Stock Test Material');
    await page.click('select[name="material_type"]');
    await page.click('option:has-text("ppf_film")');
    await page.click('select[name="unit_of_measure"]');
    await page.click('option:has-text("meter")');
    await page.fill('input[name="current_stock"]', '100');
    await page.fill('input[name="minimum_stock"]', '20');
    
    await page.click('button:has-text("Save Material")');
    await expect(page.locator('text=Material created successfully')).toBeVisible({ timeout: 5000 });
    
    // Get material ID for cleanup
    const materialRow = page.locator('table tr:has-text("Stock Test Material")');
    const materialId = await materialRow.getAttribute('data-material-id');
    if (materialId) {
      createdMaterials.push(materialId);
    }
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Click stock adjustment button
    await page.locator('table tr:has-text("Stock Test Material")').locator('button[aria-label="Adjust stock"]').click();
    
    // Wait for stock adjustment modal
    await page.waitForSelector('[role="dialog"]');
    
    // Add stock
    await page.click('input[name="transaction_type"]');
    await page.click('option:has-text("Stock In")');
    await page.fill('input[name="quantity"]', '50');
    await page.fill('textarea[name="notes"]', 'Purchase order replenishment');
    
    await page.click('button:has-text("Update Stock")');
    
    // Wait for success message
    await expect(page.locator('text=Stock updated successfully')).toBeVisible({ timeout: 5000 });
    
    // Verify stock was updated
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check stock level indicator
    const stockCell = page.locator('table tr:has-text("Stock Test Material") td[data-label="Current Stock"]');
    await expect(stockCell).toContainText('150');
  });

  test('should filter and search materials', async ({ page }) => {
    // Create multiple materials for testing
    for (let i = 0; i < 3; i++) {
      await page.click('button:has-text("Add Material")');
      await page.waitForSelector('[role="dialog"]');
      
      await page.fill('input[name="sku"]', `E2E-FILTER-${String(i + 1).padStart(3, '0')}`);
      await page.fill('input[name="name"]', `Filter Test Material ${i + 1}`);
      await page.click('select[name="material_type"]');
      await page.click('option:has-text("ppf_film")');
      await page.click('select[name="unit_of_measure"]');
      await page.click('option:has-text("meter")');
      
      await page.click('button:has-text("Save Material")');
      await expect(page.locator('text=Material created successfully')).toBeVisible({ timeout: 5000 });
      
      // Get material ID for cleanup
      const materialRow = page.locator(`table tr:has-text("Filter Test Material ${i + 1}")`);
      const materialId = await materialRow.getAttribute('data-material-id');
      if (materialId) {
        createdMaterials.push(materialId);
      }
    }
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Test search functionality
    await page.fill('input[placeholder="Search materials..."]', 'Filter Test Material 2');
    await page.press('input[placeholder="Search materials..."]', 'Enter');
    
    // Should only show Material 2
    await expect(page.locator('text=Filter Test Material 2')).toBeVisible();
    await expect(page.locator('text=Filter Test Material 1')).not.toBeVisible();
    await expect(page.locator('text=Filter Test Material 3')).not.toBeVisible();
    
    // Clear search
    await page.fill('input[placeholder="Search materials..."]', '');
    await page.press('input[placeholder="Search materials..."]', 'Enter');
    
    // Test type filter
    await page.click('select[name="material_type_filter"]');
    await page.click('option:has-text("PPF Film")');
    
    // Should show all PPF materials
    await expect(page.locator('text=Filter Test Material 1')).toBeVisible();
    await expect(page.locator('text=Filter Test Material 2')).toBeVisible();
    await expect(page.locator('text=Filter Test Material 3')).toBeVisible();
  });

  test('should manage material categories', async ({ page }) => {
    // Navigate to categories tab
    await page.click('text=Categories');
    await page.waitForURL('/inventory/categories');
    await page.waitForLoadState('networkidle');
    
    // Create a new category
    await page.click('button:has-text("Add Category")');
    await page.waitForSelector('[role="dialog"]');
    
    await page.fill('input[name="name"]', TEST_CATEGORY.name);
    await page.fill('input[name="code"]', TEST_CATEGORY.code);
    await page.fill('textarea[name="description"]', TEST_CATEGORY.description);
    
    await page.click('button:has-text("Save Category")');
    await expect(page.locator('text=Category created successfully')).toBeVisible({ timeout: 5000 });
    
    // Get category ID for cleanup
    const categoryRow = page.locator(`table tr:has-text("${TEST_CATEGORY.name}")`);
    const categoryId = await categoryRow.getAttribute('data-category-id');
    if (categoryId) {
      createdCategories.push(categoryId);
    }
    
    // Verify category appears in list
    await expect(page.locator(`text=${TEST_CATEGORY.name}`)).toBeVisible();
    await expect(page.locator(`text=${TEST_CATEGORY.code}`)).toBeVisible();
  });

  test('should manage suppliers', async ({ page }) => {
    // Navigate to suppliers tab
    await page.click('text=Suppliers');
    await page.waitForURL('/inventory/suppliers');
    await page.waitForLoadState('networkidle');
    
    // Create a new supplier
    await page.click('button:has-text("Add Supplier")');
    await page.waitForSelector('[role="dialog"]');
    
    await page.fill('input[name="name"]', TEST_SUPPLIER.name);
    await page.fill('input[name="email"]', TEST_SUPPLIER.email);
    await page.fill('input[name="phone"]', TEST_SUPPLIER.phone);
    await page.fill('input[name="address_city"]', TEST_SUPPLIER.address_city);
    
    await page.click('button:has-text("Save Supplier")');
    await expect(page.locator('text=Supplier created successfully')).toBeVisible({ timeout: 5000 });
    
    // Get supplier ID for cleanup
    const supplierRow = page.locator(`table tr:has-text("${TEST_SUPPLIER.name}")`);
    const supplierId = await supplierRow.getAttribute('data-supplier-id');
    if (supplierId) {
      createdSuppliers.push(supplierId);
    }
    
    // Verify supplier appears in list
    await expect(page.locator(`text=${TEST_SUPPLIER.name}`)).toBeVisible();
    await expect(page.locator(`text=${TEST_SUPPLIER.email}`)).toBeVisible();
  });

  test('should view inventory statistics', async ({ page }) => {
    // Navigate to reports/statistics tab
    await page.click('text=Statistics');
    await page.waitForURL('/inventory/statistics');
    await page.waitForLoadState('networkidle');
    
    // Check for statistics cards
    await expect(page.locator('text=Inventory Overview')).toBeVisible();
    await expect(page.locator('text=Total Materials')).toBeVisible();
    await expect(page.locator('text=Total Value')).toBeVisible();
    await expect(page.locator('text=Low Stock Items')).toBeVisible();
    
    // Check for charts
    await expect(page.locator('text=Materials by Type')).toBeVisible();
    await expect(page.locator('text=Stock Levels')).toBeVisible();
    
    // Check for recent activity
    await expect(page.locator('text=Recent Inventory Activity')).toBeVisible();
  });

  test('should handle bulk operations', async ({ page }) => {
    // Create materials for bulk operations
    for (let i = 0; i < 3; i++) {
      await page.click('button:has-text("Add Material")');
      await page.waitForSelector('[role="dialog"]');
      
      await page.fill('input[name="sku"]', `E2E-BULK-${String(i + 1).padStart(3, '0')}`);
      await page.fill('input[name="name"]', `Bulk Test Material ${i + 1}`);
      await page.click('select[name="material_type"]');
      await page.click('option:has-text("ppf_film")');
      await page.click('select[name="unit_of_measure"]');
      await page.click('option:has-text("meter")');
      
      await page.click('button:has-text("Save Material")');
      await expect(page.locator('text=Material created successfully')).toBeVisible({ timeout: 5000 });
      
      // Get material ID for cleanup
      const materialRow = page.locator(`table tr:has-text("Bulk Test Material ${i + 1}")`);
      const materialId = await materialRow.getAttribute('data-material-id');
      if (materialId) {
        createdMaterials.push(materialId);
      }
    }
    
    // Navigate back to materials tab
    await page.click('text=Materials');
    await page.waitForURL('/inventory');
    await page.waitForLoadState('networkidle');
    
    // Select materials for bulk operation
    await page.locator('input[type="checkbox"][aria-label="Select all materials"]').click();
    
    // Perform bulk stock adjustment
    await page.click('button:has-text("Bulk Actions")');
    await page.click('text=Adjust Stock');
    
    await page.waitForSelector('[role="dialog"]');
    await page.fill('input[name="transaction_type"]');
    await page.click('option:has-text("Stock In")');
    await page.fill('input[name="quantity"]', '25');
    await page.fill('textarea[name="notes"]', 'Bulk stock adjustment');
    
    await page.click('button:has-text("Apply Changes")');
    await expect(page.locator('text=Bulk stock update completed')).toBeVisible({ timeout: 5000 });
  });

  test('should export inventory data', async ({ page }) => {
    // Test export functionality
    await page.click('button:has-text("Export")');
    
    // Wait for export modal
    await page.waitForSelector('[role="dialog"]');
    
    // Select export format
    await page.click('input[name="export_format"]');
    await page.click('option:has-text("CSV")');
    
    // Select export options
    await page.click('input[name="include_images"]');
    await page.click('input[name="include_transactions"]');
    
    // Initiate export
    await page.click('button:has-text("Export Inventory")');
    
    // Wait for export confirmation
    await expect(page.locator('text=Export initiated successfully')).toBeVisible({ timeout: 5000 });
    
    // Check for download notification (actual download might not work in headless mode)
    // This test mainly verifies the UI flow
  });

  test('should handle concurrent inventory operations', async ({ page, context }) => {
    // Open second page for concurrent operations
    const page2 = await context.newPage();
    
    // Authenticate second page
    await page2.goto('/login');
    await page2.fill('input[name="email"]', 'admin@test.com');
    await page2.fill('input[name="password"]', 'adminpassword');
    await page2.click('button[type="submit"]');
    await page2.waitForURL('/dashboard');
    await page2.goto('/inventory');
    await page2.waitForLoadState('networkidle');
    
    // Create material on first page
    await page.click('button:has-text("Add Material")');
    await page.waitForSelector('[role="dialog"]');
    
    await page.fill('input[name="sku"]', 'E2E-CONCURRENT-001');
    await page.fill('input[name="name"]', 'Concurrent Test Material');
    await page.click('select[name="material_type"]');
    await page.click('option:has-text("ppf_film")');
    await page.click('select[name="unit_of_measure"]');
    await page.click('option:has-text("meter")');
    
    // Try to create same material on second page
    await page2.click('button:has-text("Add Material")');
    await page2.waitForSelector('[role="dialog"]');
    
    await page2.fill('input[name="sku"]', 'E2E-CONCURRENT-001');
    await page2.fill('input[name="name"]', 'Concurrent Test Material Duplicate');
    await page2.click('select[name="material_type"]');
    await page2.click('option:has-text("ppf_film")');
    await page2.click('select[name="unit_of_measure"]');
    await page2.click('option:has-text("meter")');
    
    // Submit on both pages
    await page.click('button:has-text("Save Material")');
    await page2.click('button:has-text("Save Material")');
    
    // First should succeed, second should fail with duplicate error
    await expect(page.locator('text=Material created successfully')).toBeVisible({ timeout: 5000 });
    await expect(page2.locator('text=SKU already exists')).toBeVisible({ timeout: 5000 });
    
    // Get material ID for cleanup
    const materialRow = page.locator('table tr:has-text("Concurrent Test Material")');
    const materialId = await materialRow.getAttribute('data-material-id');
    if (materialId) {
      createdMaterials.push(materialId);
    }
    
    await page2.close();
  });
});