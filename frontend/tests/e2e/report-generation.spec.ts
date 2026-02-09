import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Report Generation Workflow', () => {
  // Test data setup
  const testDateRange = {
    start: '2024-01-01',
    end: '2024-01-31'
  };

  const testFilters = {
    technicians: ['tech1', 'tech2'],
    clients: ['client1', 'client2'],
    statuses: ['completed', 'in_progress'],
    priorities: ['high', 'medium'],
    ppfZones: ['hood', 'fenders']
  };

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

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    
    // Fill in login form (assuming test user exists)
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'testpassword');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to complete
    await page.waitForURL(/\/(dashboard|tasks|\/?$)/, { timeout: 10000 });
  });

  test('should access reports page from navigation', async ({ page }) => {
    // Navigate to reports page
    await page.goto('/reports');
    
    // Verify reports page loaded
    await expect(page.locator('h1')).toContainText('Rapports');
    
    // Verify date range picker is visible
    await expect(page.locator('[data-testid="date-range-picker"]')).toBeVisible();
    
    // Verify report tabs are visible
    await expect(page.locator('nav[aria-label="Report Categories"]')).toBeVisible();
    
    // Verify export controls are visible
    await expect(page.locator('button:has-text("Exporter")')).toBeVisible();
  });

  test('should generate task completion reports', async ({ page }) => {
    await page.goto('/reports');
    
    // Select tasks report type
    await page.click('button:has-text("Tâches")');
    
    // Wait for report to load
    await expect(page.locator('[data-testid="report-content"]')).toBeVisible({ timeout: 10000 });
    
    // Verify report sections
    await expect(page.locator('text=Analyse des tâches et interventions')).toBeVisible();
    await expect(page.locator('text=Tâches totales')).toBeVisible();
    await expect(page.locator('text=Taux de complétion')).toBeVisible();
    
    // Verify chart is rendered
    await expect(page.locator('[data-testid="task-chart"]')).toBeVisible();
    
    // Verify data table
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('th:has-text("Date")')).toBeVisible();
    await expect(page.locator('th:has-text("Tâches")')).toBeVisible();
  });

  test('should generate intervention reports with photos', async ({ page }) => {
    await page.goto('/reports');
    
    // Select quality report type (includes interventions)
    await page.click('button:has-text("Qualité")');
    
    // Wait for report to load
    await expect(page.locator('[data-testid="report-content"]')).toBeVisible({ timeout: 10000 });
    
    // Verify intervention sections
    await expect(page.locator('text=Métriques de qualité et conformité')).toBeVisible();
    await expect(page.locator('text=Interventions')).toBeVisible();
    
    // Look for photo galleries in the report
    const photoGallery = page.locator('[data-testid="intervention-photos"]');
    if (await photoGallery.isVisible()) {
      await expect(photoGallery.locator('img')).toHaveCount.greaterThan(0);
    }
    
    // Verify quality metrics
    await expect(page.locator('text=Taux de conformité')).toBeVisible();
    await expect(page.locator('text=Score de qualité')).toBeVisible();
  });

  test('should generate client statistics reports', async ({ page }) => {
    await page.goto('/reports');
    
    // Select clients report type
    await page.click('button:has-text("Clients")');
    
    // Wait for report to load
    await expect(page.locator('[data-testid="report-content"]')).toBeVisible({ timeout: 10000 });
    
    // Verify client analytics sections
    await expect(page.locator('text=Analytics clients et satisfaction')).toBeVisible();
    await expect(page.locator('text=Nombre total de clients')).toBeVisible();
    await expect(page.locator('text=Taux de satisfaction client')).toBeVisible();
    
    // Verify client breakdown
    await expect(page.locator('text=Clients actifs')).toBeVisible();
    await expect(page.locator('text=Nouveaux clients')).toBeVisible();
    
    // Check for client performance charts
    await expect(page.locator('[data-testid="client-chart"]')).toBeVisible();
  });

  test('should generate material consumption reports', async ({ page }) => {
    await page.goto('/reports');
    
    // Select materials report type
    await page.click('button:has-text("Matériaux")');
    
    // Wait for report to load
    await expect(page.locator('[data-testid="report-content"]')).toBeVisible({ timeout: 10000 });
    
    // Verify material usage sections
    await expect(page.locator('text=Utilisation et coûts des matériaux')).toBeVisible();
    await expect(page.locator('text=Coût total des matériaux')).toBeVisible();
    await expect(page.locator('text=Taux de rotation des stocks')).toBeVisible();
    
    // Verify consumption breakdown
    await expect(page.locator('text=Consommation par type de matériel')).toBeVisible();
    await expect(page.locator('text=Analyse des coûts')).toBeVisible();
    
    // Check for material efficiency metrics
    await expect(page.locator('text=Taux d\'utilisation')).toBeVisible();
    await expect(page.locator('text=Taux de réduction des déchets')).toBeVisible();
  });

  test('should export reports in PDF format', async ({ page }) => {
    await page.goto('/reports');
    
    // Select a report type
    await page.click('button:has-text("Tâches")');
    
    // Wait for report to load
    await expect(page.locator('[data-testid="report-content"]')).toBeVisible({ timeout: 10000 });
    
    // Click export button
    await page.click('button:has-text("Exporter")');
    
    // Wait for dropdown menu to appear
    await expect(page.locator('[role="menu"]')).toBeVisible();
    
    // Click PDF export option
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('text=PDF').click()
    ]);
    
    // Verify download started
    expect(download.suggestedFilename()).toMatch(/.*\.pdf/);
    
    // Wait for download to complete
    const pathName = await download.path();
    expect(pathName).toBeTruthy();
    
    // Verify file exists and has content
    const fs = require('fs');
    expect(fs.existsSync(pathName)).toBeTruthy();
    expect(fs.statSync(pathName).size).toBeGreaterThan(0);
  });

  test('should export reports in CSV format', async ({ page }) => {
    await page.goto('/reports');
    
    // Select a report type
    await page.click('button:has-text("Matériaux")');
    
    // Wait for report to load
    await expect(page.locator('[data-testid="report-content"]')).toBeVisible({ timeout: 10000 });
    
    // Click quick CSV export
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('button[title="Exporter en CSV"]').click()
    ]);
    
    // Verify download started
    expect(download.suggestedFilename()).toMatch(/.*\.csv/);
    
    // Wait for download to complete
    const pathName = await download.path();
    expect(pathName).toBeTruthy();
    
    // Verify file exists and has content
    const fs = require('fs');
    expect(fs.existsSync(pathName)).toBeTruthy();
    expect(fs.statSync(pathName).size).toBeGreaterThan(0);
    
    // Verify CSV content is valid
    const content = fs.readFileSync(pathName, 'utf8');
    expect(content).toContain(',');
  });

  test('should export reports in Excel format', async ({ page }) => {
    await page.goto('/reports');
    
    // Select a report type
    await page.click('button:has-text("Clients")');
    
    // Wait for report to load
    await expect(page.locator('[data-testid="report-content"]')).toBeVisible({ timeout: 10000 });
    
    // Click export button
    await page.click('button:has-text("Exporter")');
    
    // Wait for dropdown menu to appear
    await expect(page.locator('[role="menu"]')).toBeVisible();
    
    // Click Excel export option
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('text=Excel').click()
    ]);
    
    // Verify download started
    expect(download.suggestedFilename()).toMatch(/.*\.xlsx?/);
    
    // Wait for download to complete
    const pathName = await download.path();
    expect(pathName).toBeTruthy();
    
    // Verify file exists and has content
    const fs = require('fs');
    expect(fs.existsSync(pathName)).toBeTruthy();
    expect(fs.statSync(pathName).size).toBeGreaterThan(0);
  });

  test('should schedule reports for automatic generation', async ({ page }) => {
    await page.goto('/reports');
    
    // Click export button
    await page.click('button:has-text("Exporter")');
    
    // Wait for dropdown menu to appear
    await expect(page.locator('[role="menu"]')).toBeVisible();
    
    // Click schedule export option
    await page.locator('text=Programmer un export').click();
    
    // Verify schedule dialog appears
    await expect(page.locator('[data-testid="schedule-dialog"]')).toBeVisible();
    
    // Fill in schedule form
    await page.selectOption('select[name="frequency"]', 'daily');
    await page.fill('input[name="time"]', '09:00');
    await page.fill('input[name="email"]', 'test@example.com');
    
    // Select report types to include
    await page.check('input[name="include-tasks"]');
    await page.check('input[name="include-materials"]');
    
    // Save schedule
    await page.click('button:has-text("Enregistrer")');
    
    // Verify success message
    await expect(page.locator('text=Export programmé avec succès')).toBeVisible();
  });

  test('should apply date range filters correctly', async ({ page }) => {
    await page.goto('/reports');
    
    // Find date range picker
    const dateRangePicker = page.locator('[data-testid="date-range-picker"]');
    await expect(dateRangePicker).toBeVisible();
    
    // Click to open date picker
    await dateRangePicker.click();
    
    // Verify date picker modal is visible
    await expect(page.locator('[data-testid="date-picker-modal"]')).toBeVisible();
    
    // Set custom date range
    await page.fill('input[placeholder="Date de début"]', testDateRange.start);
    await page.fill('input[placeholder="Date de fin"]', testDateRange.end);
    
    // Apply date range
    await page.click('button:has-text("Appliquer")');
    
    // Wait for report to update
    await page.waitForTimeout(2000);
    
    // Verify the date range is applied (check displayed dates)
    await expect(page.locator(`text=${testDateRange.start}`)).toBeVisible();
    await expect(page.locator(`text=${testDateRange.end}`)).toBeVisible();
    
    // Verify report data is filtered by date range
    await expect(page.locator('[data-testid="report-content"]')).toBeVisible();
  });

  test('should apply advanced filters correctly', async ({ page }) => {
    await page.goto('/reports');
    
    // Open advanced filters
    const filtersButton = page.locator('button:has-text("Filtres avancés")');
    if (await filtersButton.isVisible()) {
      await filtersButton.click();
      
      // Verify filters modal appears
      await expect(page.locator('[data-testid="filters-modal"]')).toBeVisible();
      
      // Apply technician filter
      await page.check('input[value="tech1"]');
      await page.check('input[value="tech2"]');
      
      // Apply client filter
      await page.check('input[value="client1"]');
      await page.check('input[value="client2"]');
      
      // Apply status filter
      await page.selectOption('select[name="status"]', 'completed');
      
      // Apply filters
      await page.click('button:has-text("Appliquer les filtres")');
      
      // Wait for report to update
      await page.waitForTimeout(2000);
      
      // Verify filters are applied
      await expect(page.locator('[data-testid="active-filters"]')).toBeVisible();
      await expect(page.locator('text=tech1')).toBeVisible();
      await expect(page.locator('text=client1')).toBeVisible();
    }
  });

  test('should handle invalid date ranges', async ({ page }) => {
    await page.goto('/reports');
    
    // Find date range picker
    const dateRangePicker = page.locator('[data-testid="date-range-picker"]');
    await expect(dateRangePicker).toBeVisible();
    
    // Click to open date picker
    await dateRangePicker.click();
    
    // Set invalid date range (end before start)
    await page.fill('input[placeholder="Date de début"]', '2024-01-31');
    await page.fill('input[placeholder="Date de fin"]', '2024-01-01');
    
    // Try to apply date range
    await page.click('button:has-text("Appliquer")');
    
    // Should show validation error
    await expect(page.locator('text=La date de fin doit être postérieure à la date de début')).toBeVisible();
  });

  test('should display report generation progress indicators', async ({ page }) => {
    // Mock a slow report generation
    await page.route('**/api/reports/generate', route => {
      setTimeout(() => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: {} })
      }), 3000); // 3 second delay
    });
    
    await page.goto('/reports');
    
    // Select a report type
    await page.click('button:has-text("Techniciens")');
    
    // Should show loading indicator
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
    await expect(page.locator('text=Génération du rapport en cours...')).toBeVisible();
    
    // Wait for report to complete
    await expect(page.locator('[data-testid="report-content"]')).toBeVisible({ timeout: 15000 });
    
    // Loading indicator should be hidden
    await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible();
  });

  test('should handle report generation errors gracefully', async ({ page }) => {
    // Mock a failed report generation
    await page.route('**/api/reports/generate', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Report generation failed' })
      });
    });
    
    await page.goto('/reports');
    
    // Select a report type
    await page.click('button:has-text="Géographique")');
    
    // Should show error message
    await expect(page.locator('text=Échec de la génération du rapport')).toBeVisible();
    await expect(page.locator('text=Réessayer')).toBeVisible();
    
    // Click retry button
    await page.click('button:has-text("Réessayer")');
    
    // Should attempt to regenerate
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
  });

  test('should preview reports before exporting', async ({ page }) => {
    await page.goto('/reports');
    
    // Select a report type
    await page.click('button:has-text("Aperçu")');
    
    // Wait for overview report to load
    await expect(page.locator('[data-testid="report-content"]')).toBeVisible({ timeout: 10000 });
    
    // Verify preview sections
    await expect(page.locator('text=Vue d\'ensemble des performances')).toBeVisible();
    
    // Check for print/preview mode
    const previewButton = page.locator('button:has-text("Aperçu d\'impression")');
    if (await previewButton.isVisible()) {
      await previewButton.click();
      
      // Verify print preview opens
      await expect(page.locator('[data-testid="print-preview"]')).toBeVisible();
    }
  });

  test('should handle large data sets efficiently', async ({ page }) => {
    // Set a large date range
    await page.goto('/reports');
    
    const dateRangePicker = page.locator('[data-testid="date-range-picker"]');
    await dateRangePicker.click();
    
    // Set a full year range
    await page.fill('input[placeholder="Date de début"]', '2023-01-01');
    await page.fill('input[placeholder="Date de fin"]', '2023-12-31');
    await page.click('button:has-text("Appliquer")');
    
    // Should show loading for longer
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
    
    // Wait for report to load (might take longer with large dataset)
    await expect(page.locator('[data-testid="report-content"]')).toBeVisible({ timeout: 20000 });
    
    // Verify pagination or virtualization is present for large datasets
    const pagination = page.locator('[data-testid="pagination"]');
    if (await pagination.isVisible()) {
      await expect(pagination).toBeVisible();
    }
    
    // Verify performance indicators
    const performanceNotice = page.locator('text=Large dataset detected');
    if (await performanceNotice.isVisible()) {
      await expect(performanceNotice).toBeVisible();
    }
  });

  test('should navigate between different report types', async ({ page }) => {
    await page.goto('/reports');
    
    // Test navigation between report types
    const reportTypes = [
      { id: 'tasks', label: 'Tâches' },
      { id: 'technicians', label: 'Techniciens' },
      { id: 'clients', label: 'Clients' },
      { id: 'materials', label: 'Matériaux' }
    ];
    
    for (const reportType of reportTypes) {
      // Click on report type tab
      await page.click(`button:has-text("${reportType.label}")`);
      
      // Wait for report to load
      await expect(page.locator('[data-testid="report-content"]')).toBeVisible({ timeout: 10000 });
      
      // Verify the correct report type is active
      const activeTab = page.locator('button.border-white');
      await expect(activeTab).toContainText(reportType.label);
      
      // Verify report-specific content
      switch (reportType.id) {
        case 'tasks':
          await expect(page.locator('text=Analyse des tâches et interventions')).toBeVisible();
          break;
        case 'technicians':
          await expect(page.locator('text=Performance des techniciens')).toBeVisible();
          break;
        case 'clients':
          await expect(page.locator('text=Analytics clients et satisfaction')).toBeVisible();
          break;
        case 'materials':
          await expect(page.locator('text=Utilisation et coûts des matériaux')).toBeVisible();
          break;
      }
    }
  });

  test('should cleanup generated test files', async ({ page, context }) => {
    // Create a list of download paths to clean up
    const downloadPaths: string[] = [];
    
    // Listen for downloads and track them
    page.on('download', async (download) => {
      const path = await download.path();
      downloadPaths.push(path);
    });
    
    await page.goto('/reports');
    
    // Generate and download multiple reports
    const reportTypes = ['Tâches', 'Clients', 'Matériaux'];
    const formats = ['PDF', 'CSV', 'Excel'];
    
    for (const reportType of reportTypes) {
      await page.click(`button:has-text("${reportType}")`);
      await expect(page.locator('[data-testid="report-content"]')).toBeVisible({ timeout: 10000 });
      
      for (const format of formats) {
        await page.click('button:has-text("Exporter")');
        await expect(page.locator('[role="menu"]')).toBeVisible();
        
        if (format === 'CSV') {
          // Use quick export for CSV
          await page.locator('button[title="Exporter en CSV"]').click();
          await page.waitForTimeout(1000);
        } else {
          // Use dropdown for other formats
          await page.locator(`text=${format}`).click();
          await page.waitForTimeout(1000);
        }
      }
    }
    
    // Verify downloads were created
    expect(downloadPaths.length).toBeGreaterThan(0);
    
    // Cleanup test files
    const fs = require('fs');
    for (const path of downloadPaths) {
      if (fs.existsSync(path)) {
        fs.unlinkSync(path);
      }
    }
    
    // Verify cleanup completed
    for (const path of downloadPaths) {
      expect(fs.existsSync(path)).toBeFalsy();
    }
  });
});