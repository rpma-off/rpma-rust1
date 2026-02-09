import { test, expect } from '@playwright/test';

// Test data fixtures
const TEST_MATERIALS = {
  valid: {
    sku: 'E2E-PPF-TEST-001',
    name: 'E2E Test PPF Film',
    description: 'Test PPF film for E2E testing',
    material_type: 'ppf_film',
    unit_of_measure: 'meter',
    current_stock: '100',
    minimum_stock: '20',
    maximum_stock: '500',
    unit_cost: '15.50',
    reorder_point: '25'
  },
  duplicate: {
    sku: 'E2E-PPF-DUP-001',
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

test.describe('Inventory Management', () => {
  // Track created materials for cleanup
  let createdMaterials: string[] = [];
  let createdSuppliers: string[] = [];

  // Authentication before each test
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Fill in login form with admin user for inventory permissions
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'adminpassword');
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('/', { timeout: 10000 });
  });

  // Cleanup after each test
  test.afterEach(async ({ page }) => {
    // Clean up created materials
    for (const sku of createdMaterials) {
      try {
        // Navigate to materials and delete the created material
        await page.goto('/inventory');
        await page.click('text=Materials');
        await page.waitForTimeout(1000);
        
        // Search for the material
        await page.fill('input[placeholder="Search materials..."]', sku);
        await page.waitForTimeout(1000);
        
        // Find and delete the material
        const materialRow = page.locator('table tbody tr').filter({ hasText: sku }).first();
        if (await materialRow.isVisible()) {
          await materialRow.locator('button:has-text("Delete")').click();
          await page.click('button:has-text("Confirm")');
          await page.waitForTimeout(500);
        }
      } catch (error) {
        console.log(`Failed to cleanup material ${sku}:`, error);
      }
    }
    
    // Clean up created suppliers
    for (const name of createdSuppliers) {
      try {
        await page.goto('/inventory');
        await page.click('text=Suppliers');
        await page.waitForTimeout(1000);
        
        const supplierRow = page.locator('table tbody tr').filter({ hasText: name }).first();
        if (await supplierRow.isVisible()) {
          await supplierRow.locator('button:has-text("Delete")').click();
          await page.click('button:has-text("Confirm")');
          await page.waitForTimeout(500);
        }
      } catch (error) {
        console.log(`Failed to cleanup supplier ${name}:`, error);
      }
    }
    
    // Reset tracking arrays
    createdMaterials = [];
    createdSuppliers = [];
  });

  // Dashboard viewing tests
  test('should display inventory dashboard with statistics', async ({ page }) => {
    // Navigate to inventory page
    await page.goto('/inventory');
    
    // Verify page title and navigation
    await expect(page.locator('h1')).toContainText('Inventory');
    await expect(page.locator('text=Materials')).toBeVisible();
    await expect(page.locator('text=Suppliers')).toBeVisible();
    await expect(page.locator('text=Reports')).toBeVisible();
    await expect(page.locator('text=Settings')).toBeVisible();
    
    // Wait for dashboard to load
    await expect(page.locator('text=Total Materials')).toBeVisible();
    
    // Verify statistics cards
    await expect(page.locator('text=Low Stock Items')).toBeVisible();
    await expect(page.locator('text=Inventory Value')).toBeVisible();
    await expect(page.locator('text=Stock Turnover')).toBeVisible();
    
    // Verify recent transactions section
    await expect(page.locator('text=Recent Transactions')).toBeVisible();
  });

  // Material catalog browsing tests
  test('should browse and filter materials catalog', async ({ page }) => {
    // Navigate to inventory and select materials tab
    await page.goto('/inventory');
    await page.click('text=Materials');
    
    // Wait for catalog to load
    await expect(page.locator('text=Material Catalog')).toBeVisible();
    
    // Verify filter controls
    await expect(page.locator('input[placeholder="Search materials..."]')).toBeVisible();
    await expect(page.locator('text=Material Type')).toBeVisible();
    await expect(page.locator('text=Category')).toBeVisible();
    
    // Test search functionality
    await page.fill('input[placeholder="Search materials..."]', 'ppf');
    await page.waitForTimeout(1000); // Wait for search results
    
    // Test material type filter
    await page.selectOption('select:has-text("Material Type")', 'ppf_film');
    await page.waitForTimeout(1000); // Wait for filter to apply
    
    // Verify materials table structure
    await expect(page.locator('text=SKU')).toBeVisible();
    await expect(page.locator('text=Name')).toBeVisible();
    await expect(page.locator('text=Type')).toBeVisible();
    await expect(page.locator('text=Stock')).toBeVisible();
    
    // Verify material rows are displayed
    const materialRows = page.locator('table tbody tr');
    await expect(materialRows.first()).toBeVisible();
  });

  // Material creation tests
  test('should create a new material successfully', async ({ page }) => {
    // Navigate to materials catalog
    await page.goto('/inventory');
    await page.click('text=Materials');
    
    // Wait for catalog to load
    await expect(page.locator('text=Material Catalog')).toBeVisible();
    
    // Click Add Material button
    await page.click('button:has-text("Add Material")');
    
    // Wait for form modal
    await expect(page.locator('text=Add New Material')).toBeVisible();
    
    // Fill in basic information using test fixture
    await page.fill('input[name="sku"]', TEST_MATERIALS.valid.sku);
    await page.fill('input[name="name"]', TEST_MATERIALS.valid.name);
    await page.fill('textarea[name="description"]', TEST_MATERIALS.valid.description);
    
    // Select material type and unit
    await page.selectOption('select[name="material_type"]', TEST_MATERIALS.valid.material_type);
    await page.selectOption('select[name="unit_of_measure"]', TEST_MATERIALS.valid.unit_of_measure);
    
    // Set inventory levels
    await page.fill('input[name="current_stock"]', TEST_MATERIALS.valid.current_stock);
    await page.fill('input[name="minimum_stock"]', TEST_MATERIALS.valid.minimum_stock);
    await page.fill('input[name="maximum_stock"]', TEST_MATERIALS.valid.maximum_stock);
    
    // Set pricing
    await page.fill('input[name="unit_cost"]', TEST_MATERIALS.valid.unit_cost);
    await page.fill('input[name="reorder_point"]', TEST_MATERIALS.valid.reorder_point);
    
    // Submit form
    await page.click('button:has-text("Create Material")');
    
    // Verify success (modal closes and material appears in catalog)
    await expect(page.locator('text=Add New Material')).not.toBeVisible();
    await expect(page.locator(`text=${TEST_MATERIALS.valid.sku}`)).toBeVisible();
    
    // Track created material for cleanup
    createdMaterials.push(TEST_MATERIALS.valid.sku);
    
    // Verify material details in the table
    const materialRow = page.locator('table tbody tr').filter({ hasText: TEST_MATERIALS.valid.sku }).first();
    await expect(materialRow.locator('td').nth(1)).toContainText(TEST_MATERIALS.valid.name);
    await expect(materialRow.locator('td').nth(2)).toContainText('PPF Film');
    await expect(materialRow.locator('td').nth(3)).toContainText(TEST_MATERIALS.valid.current_stock);
  });

  // Complete workflow test
  test('should handle complete inventory management workflow', async ({ page }) => {
    // 1. Navigate to materials catalog
    await page.goto('/inventory');
    await page.click('text=Materials');
    await expect(page.locator('text=Material Catalog')).toBeVisible();
    
    // 2. Create a new material
    await page.click('button:has-text("Add Material")');
    await expect(page.locator('text=Add New Material')).toBeVisible();
    
    const testMaterial = {
      sku: `E2E-WORKFLOW-${Date.now()}`,
      name: 'Workflow Test Material',
      description: 'Material for workflow testing',
      material_type: 'ppf_film',
      unit_of_measure: 'meter',
      current_stock: '150',
      minimum_stock: '30',
      maximum_stock: '600',
      unit_cost: '18.75',
      reorder_point: '35'
    };
    
    // Fill form
    await page.fill('input[name="sku"]', testMaterial.sku);
    await page.fill('input[name="name"]', testMaterial.name);
    await page.fill('textarea[name="description"]', testMaterial.description);
    await page.selectOption('select[name="material_type"]', testMaterial.material_type);
    await page.selectOption('select[name="unit_of_measure"]', testMaterial.unit_of_measure);
    await page.fill('input[name="current_stock"]', testMaterial.current_stock);
    await page.fill('input[name="minimum_stock"]', testMaterial.minimum_stock);
    await page.fill('input[name="maximum_stock"]', testMaterial.maximum_stock);
    await page.fill('input[name="unit_cost"]', testMaterial.unit_cost);
    await page.fill('input[name="reorder_point"]', testMaterial.reorder_point);
    
    // Submit form
    await page.click('button:has-text("Create Material")');
    await expect(page.locator('text=Add New Material')).not.toBeVisible();
    
    // Track for cleanup
    createdMaterials.push(testMaterial.sku);
    
    // 3. Verify material appears in catalog
    await expect(page.locator(`text=${testMaterial.sku}`)).toBeVisible();
    
    // 4. Update stock levels
    const materialRow = page.locator('table tbody tr').filter({ hasText: testMaterial.sku }).first();
    await materialRow.locator('button:has-text("View")').click();
    
    // Wait for material details page
    await expect(page.locator('h1')).toContainText(testMaterial.name);
    
    // Click on stock adjustment
    await page.click('button:has-text("Adjust Stock")');
    await expect(page.locator('text=Stock Adjustment')).toBeVisible();
    
    // Fill adjustment details
    await page.fill('input[name="quantity_change"]', '50');
    await page.selectOption('select[name="adjustment_type"]', 'add');
    await page.selectOption('select[name="reason"]', 'purchase');
    await page.fill('textarea[name="notes"]', 'Test stock adjustment for workflow');
    
    // Submit adjustment
    await page.click('button:has-text("Update Stock")');
    await expect(page.locator('text=Stock Adjustment')).not.toBeVisible();
    
    // Verify stock is updated
    const updatedStock = parseFloat(testMaterial.current_stock) + 50;
    await expect(page.locator(`text=${updatedStock}`)).toBeVisible();
    
    // 5. Search and filter functionality
    await page.goto('/inventory');
    await page.click('text=Materials');
    
    // Test search by SKU
    await page.fill('input[placeholder="Search materials..."]', testMaterial.sku);
    await page.waitForTimeout(1000);
    
    // Should find our material
    await expect(page.locator('table tbody tr').filter({ hasText: testMaterial.sku })).toBeVisible();
    
    // Test type filter
    await page.fill('input[placeholder="Search materials..."]', '');
    await page.waitForTimeout(500);
    await page.selectOption('select:has-text("Material Type")', 'ppf_film');
    await page.waitForTimeout(1000);
    
    // Should still find our material
    await expect(page.locator('table tbody tr').filter({ hasText: testMaterial.sku })).toBeVisible();
    
    // 6. Edit material details
    await page.click('table tbody tr').filter({ hasText: testMaterial.sku }).first().locator('button:has-text("Edit")');
    await expect(page.locator('text=Edit Material')).toBeVisible();
    
    // Update some fields
    const newName = 'Updated Workflow Material';
    await page.fill('input[name="name"]', newName);
    await page.fill('input[name="minimum_stock"]', '40');
    
    // Submit changes
    await page.click('button:has-text("Update Material")');
    await expect(page.locator('text=Edit Material')).not.toBeVisible();
    
    // Verify changes
    await expect(page.locator(`text=${newName}`)).toBeVisible();
    
    // 7. Test material consumption tracking (create intervention to consume material)
    await page.goto('/tasks');
    
    // Create a test task to consume the material
    await page.click('button:has-text("Add")');
    await page.waitForURL('/tasks/new');
    
    await page.fill('input[name="title"]', 'Test Task for Material Consumption');
    await page.selectOption('select[name="client_id"]', { label: 'Client A' });
    await page.fill('input[name="vehicle_make"]', 'Toyota');
    await page.fill('input[name="vehicle_model"]', 'Camry');
    await page.fill('input[name="vehicle_plate"]', 'TEST-123');
    await page.click('button[type="submit"]');
    
    // Wait for task creation
    await page.waitForURL(/\/tasks\/[a-zA-Z0-9-]+/);
    
    // Start intervention
    await page.click('button:has-text("Start Intervention")');
    await page.click('text=Intervention');
    
    // Add material consumption
    await expect(page.locator('text=Materials Used')).toBeVisible();
    await page.click('button:has-text("Add Material")');
    
    // Select our test material
    await expect(page.locator('text=Select Material')).toBeVisible();
    await page.click('table tbody tr').filter({ hasText: testMaterial.sku }).first();
    
    // Fill consumption details
    await page.fill('input[name="quantity_used"]', '10');
    await page.fill('input[name="waste_quantity"]', '1');
    await page.click('button:has-text("Add Material")');
    
    // Verify material is added to consumption list
    await expect(page.locator('text=Select Material')).not.toBeVisible();
    await expect(page.locator(`text=${testMaterial.name}`)).toBeVisible();
    
    // 8. Verify data persistence across page refresh
    await page.reload();
    await page.waitForURL(/\/tasks\/[a-zA-Z0-9-]+/);
    
    // Verify material consumption is still recorded
    await page.click('text=Intervention');
    await expect(page.locator(`text=${testMaterial.name}`)).toBeVisible();
    
    // 9. Check inventory reflects the consumption
    await page.goto('/inventory');
    await page.click('text=Materials');
    
    // Search for our material
    await page.fill('input[placeholder="Search materials..."]', testMaterial.sku);
    await page.waitForTimeout(1000);
    
    // Stock should be reduced by consumption amount
    const expectedStock = updatedStock - 10 - 1; // Used + waste
    const stockCell = page.locator('table tbody tr').filter({ hasText: testMaterial.sku }).first().locator('td').nth(3);
    await expect(stockCell).toContainText(expectedStock.toString());
  });

  // Material editing tests
  test('should edit an existing material', async ({ page }) => {
    // Navigate to materials catalog
    await page.goto('/inventory');
    await page.click('text=Materials');
    
    // Wait for materials to load
    await page.waitForTimeout(1000);
    
    // Click edit button on first material
    await page.click('table tbody tr:first-child button:has-text("Edit")');
    
    // Wait for form modal
    await expect(page.locator('text=Edit Material')).toBeVisible();
    
    // Update some fields
    await page.fill('input[name="name"]', 'Updated Material Name');
    await page.fill('input[name="minimum_stock"]', '30');
    
    // Submit form
    await page.click('button:has-text("Update Material")');
    
    // Verify success
    await expect(page.locator('text=Edit Material')).not.toBeVisible();
    await expect(page.locator('text=Updated Material Name')).toBeVisible();
  });

  // Stock management tests
  test('should update material stock levels', async ({ page }) => {
    // Navigate to materials catalog
    await page.goto('/inventory');
    await page.click('text=Materials');
    
    // Wait for materials to load
    await page.waitForTimeout(1000);
    
    // Click on a material to view details
    await page.click('table tbody tr:first-child');
    
    // Look for stock management section
    await expect(page.locator('text=Current Stock')).toBeVisible();
    
    // Click on stock adjustment button
    await page.click('button:has-text("Adjust Stock")');
    
    // Wait for stock adjustment modal
    await expect(page.locator('text=Stock Adjustment')).toBeVisible();
    
    // Fill adjustment details
    await page.fill('input[name="quantity_change"]', '50');
    await page.selectOption('select[name="reason"]', 'purchase');
    await page.fill('textarea[name="notes"]', 'Test stock adjustment');
    
    // Submit adjustment
    await page.click('button:has-text("Update Stock")');
    
    // Verify stock level is updated
    await expect(page.locator('text=Stock Adjustment')).not.toBeVisible();
  });

  // Integration with interventions tests
  test('should record material consumption during intervention', async ({ page }) => {
    // Navigate to an intervention
    await page.goto('/tasks');
    await page.click('.grid > div:first-child > div');
    await page.waitForURL(/\/tasks\/[a-zA-Z0-9-]+/);
    
    // Click on intervention tab
    await page.click('text=Intervention');
    
    // Look for material consumption section
    await expect(page.locator('text=Materials Used')).toBeVisible();
    
    // Click add material button
    await page.click('button:has-text("Add Material")');
    
    // Wait for material selection modal
    await expect(page.locator('text=Select Material')).toBeVisible();
    
    // Select a material
    await page.click('table tbody tr:first-child');
    
    // Fill quantity used
    await page.fill('input[name="quantity_used"]', '5');
    await page.fill('input[name="waste_quantity"]', '0.5');
    
    // Submit material consumption
    await page.click('button:has-text("Add Material")');
    
    // Verify material is added to consumption list
    await expect(page.locator('text=Select Material')).not.toBeVisible();
  });

  // Reports generation tests
  test('should generate inventory reports', async ({ page }) => {
    // Navigate to inventory reports
    await page.goto('/inventory');
    await page.click('text=Reports');
    
    // Wait for reports to load
    await expect(page.locator('text=Inventory Reports')).toBeVisible();
    
    // Select report type
    await page.selectOption('select[name="report_type"]', 'material_usage');
    
    // Set date range
    await page.fill('input[name="start_date"]', '2024-01-01');
    await page.fill('input[name="end_date"]', '2024-12-31');
    
    // Generate report
    await page.click('button:has-text("Generate Report")');
    
    // Wait for report to load
    await page.waitForTimeout(2000);
    
    // Verify report data is displayed
    await expect(page.locator('text=Material Usage Report')).toBeVisible();
    
    // Test export functionality
    await page.click('button:has-text("Export")');
    await expect(page.locator('text=Export Format')).toBeVisible();
    await page.click('text=PDF');
  });

  // Low stock alerts tests
  test('should display low stock alerts and enable reordering', async ({ page }) => {
    // Navigate to inventory dashboard
    await page.goto('/inventory');
    
    // Look for low stock items card
    await expect(page.locator('text=Low Stock Items')).toBeVisible();
    
    // If there are low stock items, verify they're highlighted
    const lowStockCount = await page.locator('.text-2xl.font-bold').nth(1).textContent();
    if (lowStockCount && parseInt(lowStockCount) > 0) {
      // Navigate to materials catalog
      await page.click('text=Materials');
      
      // Verify low stock indicators
      await expect(page.locator('button:has([data-testid="AlertTriangle"])')).toBeVisible();
      
      // Click on a low stock item to reorder
      await page.click('button:has([data-testid="AlertTriangle"])');
      
      // Look for reorder functionality
      await expect(page.locator('text=Reorder')).toBeVisible();
      await page.click('button:has-text("Reorder")');
      
      // Fill reorder details
      await expect(page.locator('text=Reorder Material')).toBeVisible();
      await page.fill('input[name="quantity"]', '100');
      await page.click('button:has-text("Create Purchase Order")');
      
      // Verify reorder was created
      await expect(page.locator('text=Purchase Order Created')).toBeVisible();
    }
  });

  // Error handling tests
  test('should handle form validation errors properly', async ({ page }) => {
    // Navigate to materials catalog
    await page.goto('/inventory');
    await page.click('text=Materials');
    
    // Click Add Material button
    await page.click('button:has-text("Add Material")');
    await expect(page.locator('text=Add New Material')).toBeVisible();
    
    // Test 1: Submit empty form
    await page.click('button:has-text("Create Material")');
    
    // Verify validation errors
    await expect(page.locator('text=SKU is required').or(page.locator('text=Le SKU est requis'))).toBeVisible();
    await expect(page.locator('text=Name is required').or(page.locator('text=Le nom est requis'))).toBeVisible();
    await expect(page.locator('text=Material type is required').or(page.locator('text=Le type de matériau est requis'))).toBeVisible();
    await expect(page.locator('text=Unit of measure is required').or(page.locator('text=L\'unité de mesure est requise'))).toBeVisible();
    
    // Test 2: Invalid SKU format
    await page.fill('input[name="sku"]', 'invalid-sku-with-spaces');
    await expect(page.locator('text=Invalid SKU format').or(page.locator('text=Format de SKU invalide'))).toBeVisible();
    
    // Test 3: Negative stock values
    await page.fill('input[name="sku"]', 'E2E-NEGATIVE-TEST');
    await page.fill('input[name="name"]', 'Negative Stock Test');
    await page.selectOption('select[name="material_type"]', 'ppf_film');
    await page.selectOption('select[name="unit_of_measure"]', 'meter');
    await page.fill('input[name="current_stock"]', '-10');
    
    await page.click('button:has-text("Create Material")');
    await expect(page.locator('text=Stock cannot be negative').or(page.locator('text=Le stock ne peut être négatif'))).toBeVisible();
    
    // Test 4: Invalid pricing
    await page.fill('input[name="current_stock"]', '10');
    await page.fill('input[name="unit_cost"]', '-5.50');
    
    await page.click('button:has-text("Create Material")');
    await expect(page.locator('text=Unit cost must be positive').or(page.locator('text=Le coût unitaire doit être positif'))).toBeVisible();
    
    // Test 5: Duplicate SKU - First create a material
    await page.fill('input[name="unit_cost"]', '15.50');
    await page.click('button:has-text("Create Material")');
    await expect(page.locator('text=Add New Material')).not.toBeVisible();
    
    // Track first material
    createdMaterials.push('E2E-NEGATIVE-TEST');
    
    // Try to create another with same SKU
    await page.click('button:has-text("Add Material")');
    await page.fill('input[name="sku"]', 'E2E-NEGATIVE-TEST');
    await page.fill('input[name="name"]', 'Duplicate SKU Test');
    await page.selectOption('select[name="material_type"]', 'adhesive');
    await page.selectOption('select[name="unit_of_measure"]', 'liter');
    
    await page.click('button:has-text("Create Material")');
    await expect(page.locator('text=SKU already exists').or(page.locator('text=Le SKU existe déjà'))).toBeVisible();
    
    // Test 6: Cancel form should not save data
    await page.click('button:has-text("Cancel").or(page.locator('button:has-text("Annuler"))');
    await expect(page.locator('text=Add New Material')).not.toBeVisible();
    
    // Verify material was not created
    await expect(page.locator('text=Duplicate SKU Test')).not.toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Navigate to materials catalog
    await page.goto('/inventory');
    await page.click('text=Materials');
    
    // Simulate network error for material creation
    await page.route('**/api/materials/**', route => {
      route.abort('failed');
    });
    
    // Try to create a material
    await page.click('button:has-text("Add Material")');
    await expect(page.locator('text=Add New Material')).toBeVisible();
    
    // Fill form with valid data
    await page.fill('input[name="sku"]', 'E2E-NETWORK-TEST');
    await page.fill('input[name="name"]', 'Network Error Test');
    await page.selectOption('select[name="material_type"]', 'ppf_film');
    await page.selectOption('select[name="unit_of_measure"]', 'meter');
    await page.fill('input[name="current_stock"]', '10');
    
    // Submit form
    await page.click('button:has-text("Create Material")');
    
    // Should show network error message
    await expect(page.locator('text=Network error').or(page.locator('text=Erreur réseau')).or(page.locator('text=Failed to create material'))).toBeVisible();
    
    // Form should remain open with data preserved
    await expect(page.locator('input[name="sku"]')).toHaveValue('E2E-NETWORK-TEST');
  });

  // Search and filter tests
  test('should search and filter materials effectively', async ({ page }) => {
    // Navigate to materials catalog
    await page.goto('/inventory');
    await page.click('text=Materials');
    
    // Test search by SKU
    await page.fill('input[placeholder="Search materials..."]', 'PPF');
    await page.waitForTimeout(1000);
    
    // Verify search results
    const materials = page.locator('table tbody tr');
    await expect(materials.first()).toBeVisible();
    
    // Clear search
    await page.fill('input[placeholder="Search materials..."]', '');
    await page.waitForTimeout(1000);
    
    // Test type filter
    await page.selectOption('select:has-text("Material Type")', 'ppf_film');
    await page.waitForTimeout(1000);
    
    // Verify filtered results
    await expect(page.locator('text=ppf film')).toBeVisible();
    
    // Test category filter
    await page.selectOption('select:has-text("Category")', 'Films');
    await page.waitForTimeout(1000);
    
    // Verify filtered results
    await expect(page.locator('table tbody tr').first()).toBeVisible();
  });

  // Supplier management tests
  test('should manage suppliers effectively', async ({ page }) => {
    // Navigate to suppliers
    await page.goto('/inventory');
    await page.click('text=Suppliers');
    
    // Wait for suppliers to load
    await expect(page.locator('text=Supplier Management')).toBeVisible();
    
    // Add new supplier
    await page.click('button:has-text("Add Supplier")');
    
    // Wait for supplier form
    await expect(page.locator('text=Add New Supplier')).toBeVisible();
    
    // Fill supplier information
    await page.fill('input[name="name"]', 'Test Supplier');
    await page.fill('input[name="email"]', 'supplier@example.com');
    await page.fill('input[name="phone"]', '555-1234');
    await page.fill('input[name="address_city"]', 'Test City');
    
    // Submit form
    await page.click('button:has-text("Create Supplier")');
    
    // Verify supplier was created
    await expect(page.locator('text=Test Supplier')).toBeVisible();
  });

  // Analytics and insights tests
  test('should display inventory analytics and insights', async ({ page }) => {
    // Navigate to inventory reports
    await page.goto('/inventory');
    await page.click('text=Reports');
    
    // Generate analytics report
    await page.selectOption('select[name="report_type"]', 'analytics');
    await page.fill('input[name="start_date"]', '2024-01-01');
    await page.fill('input[name="end_date"]', '2024-12-31');
    await page.click('button:has-text("Generate Report")');
    
    // Wait for report
    await page.waitForTimeout(2000);
    
    // Verify analytics sections
    await expect(page.locator('text=Inventory Analytics')).toBeVisible();
    await expect(page.locator('text=Material Usage Trends')).toBeVisible();
    await expect(page.locator('text=Stock Levels Analysis')).toBeVisible();
    await expect(page.locator('text=Supplier Performance')).toBeVisible();
    
    // Verify charts are displayed
    await expect(page.locator('[data-testid="usage-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="stock-chart"]')).toBeVisible();
  });

  // Data persistence tests
  test('should maintain data integrity across page refreshes and sessions', async ({ page }) => {
    // 1. Create a material
    await page.goto('/inventory');
    await page.click('text=Materials');
    await page.click('button:has-text("Add Material")');
    
    const testMaterial = {
      sku: `E2E-PERSIST-${Date.now()}`,
      name: 'Persistence Test Material',
      material_type: 'ppf_film',
      unit_of_measure: 'meter',
      current_stock: '200'
    };
    
    // Fill form and create material
    await page.fill('input[name="sku"]', testMaterial.sku);
    await page.fill('input[name="name"]', testMaterial.name);
    await page.selectOption('select[name="material_type"]', testMaterial.material_type);
    await page.selectOption('select[name="unit_of_measure"]', testMaterial.unit_of_measure);
    await page.fill('input[name="current_stock"]', testMaterial.current_stock);
    
    await page.click('button:has-text("Create Material")');
    await expect(page.locator('text=Add New Material')).not.toBeVisible();
    
    // Track for cleanup
    createdMaterials.push(testMaterial.sku);
    
    // 2. Verify material exists
    await expect(page.locator(`text=${testMaterial.sku}`)).toBeVisible();
    
    // 3. Refresh page and verify material still exists
    await page.reload();
    await page.waitForTimeout(1000);
    await expect(page.locator(`text=${testMaterial.sku}`)).toBeVisible();
    
    // 4. Navigate away and back
    await page.goto('/tasks');
    await page.goto('/inventory');
    await page.click('text=Materials');
    
    // Verify material still exists
    await expect(page.locator(`text=${testMaterial.sku}`)).toBeVisible();
    
    // 5. Update stock level
    const materialRow = page.locator('table tbody tr').filter({ hasText: testMaterial.sku }).first();
    await materialRow.locator('button:has-text("View")').click();
    
    await page.click('button:has-text("Adjust Stock")');
    await page.fill('input[name="quantity_change"]', '25');
    await page.selectOption('select[name="adjustment_type"]', 'add');
    await page.selectOption('select[name="reason"]', 'purchase');
    await page.click('button:has-text("Update Stock")');
    
    // 6. Refresh and verify stock update persists
    await page.reload();
    await page.waitForTimeout(1000);
    
    const expectedStock = parseFloat(testMaterial.current_stock) + 25;
    await expect(page.locator(`text=${expectedStock}`)).toBeVisible();
    
    // 7. Test search persistence
    await page.goto('/inventory');
    await page.click('text=Materials');
    
    // Search for material
    await page.fill('input[placeholder="Search materials..."]', testMaterial.sku);
    await page.waitForTimeout(1000);
    
    // Refresh page and verify search persists (if implemented)
    await page.reload();
    await page.waitForTimeout(1000);
    
    // Either search should persist or results should still show material
    const searchInput = page.locator('input[placeholder="Search materials..."]');
    const hasSearchValue = await searchInput.inputValue() === testMaterial.sku;
    const materialVisible = await page.locator('table tbody tr').filter({ hasText: testMaterial.sku }).isVisible();
    
    expect(hasSearchValue || materialVisible).toBeTruthy();
  });

  // Performance tests
  test('should handle large datasets efficiently', async ({ page }) => {
    // Navigate to materials catalog
    await page.goto('/inventory');
    await page.click('text=Materials');
    
    // Wait for initial load
    await page.waitForTimeout(1000);
    
    // Navigate through multiple pages
    for (let i = 0; i < 5; i++) {
      await page.click('button:has-text("Next")');
      await page.waitForTimeout(500);
    }
    
    // Verify performance remains acceptable
    await expect(page.locator('table tbody tr').first()).toBeVisible();
    
    // Test search with large dataset
    await page.fill('input[placeholder="Search materials..."]', 'film');
    await page.waitForTimeout(2000); // Allow time for search
    
    // Verify search results load efficiently
    await expect(page.locator('table tbody tr').first()).toBeVisible();
  });

  // Accessibility tests
  test('should be accessible', async ({ page }) => {
    // Navigate to inventory
    await page.goto('/inventory');
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    
    // Continue tabbing through major elements
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
    }
    
    // Test screen reader support
    const heading = page.locator('h1');
    await expect(heading).toHaveAttribute('role', 'heading');
    
    // Test ARIA labels on interactive elements
    const addButton = page.locator('button:has-text("Add Material")');
    await expect(addButton).toHaveAttribute('aria-label');
    
    // Test form accessibility
    await page.click('button:has-text("Add Material")');
    
    // Verify form fields have proper labels
    const skuField = page.locator('input[name="sku"]');
    await expect(skuField).toHaveAttribute('aria-label');
    
    // Verify form validation messages are accessible
    await page.click('button:has-text("Create Material")');
    await expect(page.locator('text=SKU is required')).toBeVisible();
  });

  // Responsive design tests
  test('should be responsive on different viewports', async ({ page }) => {
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/inventory');
    
    // Verify mobile layout
    await expect(page.locator('nav[role="navigation"]')).toBeVisible();
    await expect(page.locator('.mobile-menu-button')).toBeVisible();
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('.sidebar')).toBeVisible();
    
    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('.full-width-layout')).toBeVisible();
  });
});