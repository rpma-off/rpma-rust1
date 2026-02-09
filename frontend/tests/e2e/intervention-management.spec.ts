import { test, expect } from '@playwright/test';

test.describe('Intervention Management', () => {
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

  test('should start a new intervention for a task', async ({ page }) => {
    // First, navigate to tasks page and select a task
    await page.goto('/tasks');
    
    // Wait for tasks to load
    await expect(page.locator('h1')).toContainText('Jobs');
    
    // Click on the first task in the list
    await page.click('.grid > div:first-child > div');
    
    // Wait for task detail page to load
    await page.waitForURL(/\/tasks\/[a-zA-Z0-9-]+/);
    
    // Look for "Start Intervention" button
    const startInterventionButton = page.locator('button:has-text("Commencer"), button:has-text("Start Intervention")');
    if (await startInterventionButton.isVisible()) {
      await startInterventionButton.click();
    } else {
      // Alternative: Look for intervention tab or section
      await page.click('text=Intervention');
    }
    
    // Wait for intervention start form/modal
    await expect(page.locator('h2:has-text("Nouvelle intervention"), h2:has-text("Start Intervention")')).toBeVisible();
    
    // Fill in intervention details
    await page.selectOption('select[name="intervention_type"]', 'ppf_full_vehicle');
    await page.fill('input[name="temperature"]', '22');
    await page.fill('input[name="humidity"]', '45');
    
    // Select PPF zones
    const hoodCheckbox = page.locator('input[name="ppf_zones[]"][value="hood"]');
    if (await hoodCheckbox.isVisible()) {
      await hoodCheckbox.check();
    }
    
    const fendersCheckbox = page.locator('input[name="ppf_zones[]"][value="fenders"]');
    if (await fendersCheckbox.isVisible()) {
      await fendersCheckbox.check();
    }
    
    // Add notes
    await page.fill('textarea[name="notes"]', 'Test intervention notes');
    
    // Start the intervention
    await page.click('button:has-text("Démarrer"), button:has-text("Start")');
    
    // Verify intervention was started
    await expect(page.locator('text=Intervention en cours')).toBeVisible();
    await expect(page.locator('.progress-bar')).toBeVisible();
  });

  test('should advance through intervention steps', async ({ page }) => {
    // Start an intervention first (or navigate to existing one)
    await page.goto('/tasks');
    await page.click('.grid > div:first-child > div');
    await page.waitForURL(/\/tasks\/[a-zA-Z0-9-]+/);
    
    // Click on intervention tab if intervention exists
    const interventionTab = page.locator('text=Intervention, text=Workflow');
    if (await interventionTab.isVisible()) {
      await interventionTab.click();
    }
    
    // Check if intervention is in progress
    const currentStep = page.locator('.current-step, .step.active');
    if (await currentStep.isVisible()) {
      // Get current step name
      const stepName = await currentStep.textContent();
      
      // Look for step completion button
      const completeStepButton = page.locator('button:has-text("Terminer"), button:has-text("Complete Step")');
      if (await completeStepButton.isVisible()) {
        await completeStepButton.click();
      }
      
      // If photos are required, upload test photos
      const photoUpload = page.locator('input[type="file"]');
      if (await photoUpload.isVisible()) {
        await photoUpload.setInputFiles('test-assets/step-photo.jpg');
        await page.waitForTimeout(2000); // Wait for upload
      }
      
      // Fill in any required data for the step
      const notesInput = page.locator('textarea[name="step_notes"], textarea[name="observations"]');
      if (await notesInput.isVisible()) {
        await notesInput.fill('Step completed successfully');
      }
      
      // Confirm step completion
      const confirmButton = page.locator('button:has-text("Confirmer"), button:has-text("Confirm")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
      
      // Verify step was completed and next step is active
      await expect(page.locator('.step.completed')).toBeVisible();
      await expect(page.locator('.progress-bar')).toHaveAttribute('value', /\d+/); // Progress updated
    }
  });

  test('should handle quality checkpoints during intervention', async ({ page }) => {
    // Navigate to an in-progress intervention
    await page.goto('/tasks');
    await page.click('.grid > div:first-child > div');
    await page.waitForURL(/\/tasks\/[a-zA-Z0-9-]+/);
    
    // Click on intervention tab
    await page.click('text=Intervention');
    
    // Look for quality checkpoint section
    const qualitySection = page.locator('text=Contrôle qualité, text=Quality Check');
    if (await qualitySection.isVisible()) {
      // Find first quality checkpoint
      const firstCheckpoint = page.locator('.quality-checkpoint').first();
      if (await firstCheckpoint.isVisible()) {
        // Mark checkpoint as passed
        const passButton = firstCheckpoint.locator('button:has-text("Passer"), button:has-text("Pass")');
        if (await passButton.isVisible()) {
          await passButton.click();
        }
        
        // Add quality notes if required
        const notesInput = firstCheckpoint.locator('textarea');
        if (await notesInput.isVisible()) {
          await notesInput.fill('Quality check passed - no issues found');
        }
        
        // Submit quality check
        const submitButton = firstCheckpoint.locator('button:has-text("Valider"), button:has-text("Submit")');
        if (await submitButton.isVisible()) {
          await submitButton.click();
        }
        
        // Verify checkpoint was marked as passed
        await expect(firstCheckpoint.locator('.status-passed')).toBeVisible();
      }
    }
  });

  test('should pause and resume intervention', async ({ page }) => {
    // Navigate to an in-progress intervention
    await page.goto('/tasks');
    await page.click('.grid > div:first-child > div');
    await page.waitForURL(/\/tasks\/[a-zA-Z0-9-]+/);
    
    // Click on intervention tab
    await page.click('text=Intervention');
    
    // Look for pause button
    const pauseButton = page.locator('button:has-text("Pause"), button:has-text("Mettre en pause")');
    if (await pauseButton.isVisible()) {
      await pauseButton.click();
      
      // Add pause reason if required
      const reasonInput = page.locator('textarea[name="pause_reason"]');
      if (await reasonInput.isVisible()) {
        await reasonInput.fill('Waiting for customer confirmation');
      }
      
      // Confirm pause
      const confirmButton = page.locator('button:has-text("Confirmer"), button:has-text("Confirm")');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
      
      // Verify intervention is paused
      await expect(page.locator('text=Intervention en pause')).toBeVisible();
      
      // Now resume the intervention
      const resumeButton = page.locator('button:has-text("Reprendre"), button:has-text("Resume")');
      if (await resumeButton.isVisible()) {
        await resumeButton.click();
        
        // Verify intervention is resumed
        await expect(page.locator('text=Intervention en cours')).toBeVisible();
      }
    }
  });

  test('should finalize intervention with all required data', async ({ page }) => {
    // Navigate to an in-progress intervention near completion
    await page.goto('/tasks');
    await page.click('.grid > div:first-child > div');
    await page.waitForURL(/\/tasks\/[a-zA-Z0-9-]+/);
    
    // Click on intervention tab
    await page.click('text=Intervention');
    
    // Look for finalize button
    const finalizeButton = page.locator('button:has-text("Finaliser"), button:has-text("Finalize")');
    if (await finalizeButton.isVisible()) {
      await finalizeButton.click();
      
      // Wait for finalization form
      await expect(page.locator('h2:has-text("Finalisation"), h2:has-text("Finalization")')).toBeVisible();
      
      // Fill in final data
      const finalNotes = page.locator('textarea[name="final_notes"], textarea[name="final_observations"]');
      if (await finalNotes.isVisible()) {
        await finalNotes.fill('Intervention completed successfully. Customer satisfied with the result.');
      }
      
      // Upload final photos if required
      const finalPhotoUpload = page.locator('input[type="file"][accept*="image"]');
      if (await finalPhotoUpload.isVisible()) {
        await finalPhotoUpload.setInputFiles('test-assets/final-photo.jpg');
        await page.waitForTimeout(2000); // Wait for upload
      }
      
      // Set customer satisfaction
      const satisfactionSlider = page.locator('input[type="range"][name="customer_satisfaction"]');
      if (await satisfactionSlider.isVisible()) {
        await satisfactionSlider.fill('5'); // Maximum satisfaction
      }
      
      // Finalize the intervention
      await page.click('button:has-text("Confirmer finalisation"), button:has-text("Confirm Finalization")');
      
      // Verify intervention was finalized
      await expect(page.locator('text=Intervention terminée')).toBeVisible();
      await expect(page.locator('.progress-bar')).toHaveAttribute('value', '100');
      
      // Check for completion summary or certificate
      await expect(page.locator('text=Résumé, text=Certificate')).toBeVisible();
    }
  });

  test('should handle intervention errors and corrections', async ({ page }) => {
    // Navigate to an in-progress intervention
    await page.goto('/tasks');
    await page.click('.grid > div:first-child > div');
    await page.waitForURL(/\/tasks\/[a-zA-Z0-9-]+/);
    
    // Click on intervention tab
    await page.click('text=Intervention');
    
    // Try to advance step without required data
    const completeStepButton = page.locator('button:has-text("Terminer"), button:has-text("Complete Step")');
    if (await completeStepButton.isVisible()) {
      await completeStepButton.click();
      
      // Should show validation errors
      await expect(page.locator('text=Photos requises, text=Required fields missing')).toBeVisible();
      
      // Now add the required data
      const photoUpload = page.locator('input[type="file"]');
      if (await photoUpload.isVisible()) {
        await photoUpload.setInputFiles('test-assets/required-photo.jpg');
        await page.waitForTimeout(2000);
      }
      
      // Fill required notes
      const notesInput = page.locator('textarea[name="notes"], textarea[name="observations"]');
      if (await notesInput.isVisible()) {
        await notesInput.fill('Required data now provided');
      }
      
      // Try to complete step again
      await page.click('button:has-text("Terminer"), button:has-text("Complete Step")');
      
      // Should now succeed
      await expect(page.locator('.step.completed')).toBeVisible();
    }
  });

  test('should generate intervention report and certificate', async ({ page }) => {
    // Navigate to a completed intervention
    await page.goto('/tasks');
    await page.click('.grid > div:first-child > div');
    await page.waitForURL(/\/tasks\/[a-zA-Z0-9-]+/);
    
    // Click on intervention tab
    await page.click('text=Intervention');
    
    // Look for report generation button
    const reportButton = page.locator('button:has-text("Générer rapport"), button:has-text("Generate Report")');
    if (await reportButton.isVisible()) {
      await reportButton.click();
      
      // Wait for report to be generated
      await expect(page.locator('text=Rapport généré, text=Report generated')).toBeVisible();
      
      // Download the report
      const downloadButton = page.locator('button:has-text("Télécharger"), button:has-text("Download")');
      if (await downloadButton.isVisible()) {
        const downloadPromise = page.waitForEvent('download');
        await downloadButton.click();
        const download = await downloadPromise;
        
        // Verify download started
        expect(download.suggestedFilename()).toMatch(/.*\.pdf/);
      }
    }
    
    // Look for certificate generation button
    const certificateButton = page.locator('button:has-text("Générer certificat"), button:has-text("Generate Certificate")');
    if (await certificateButton.isVisible()) {
      await certificateButton.click();
      
      // Wait for certificate to be generated
      await expect(page.locator('text=Certificat généré, text=Certificate generated')).toBeVisible();
      
      // Download the certificate
      const downloadButton = page.locator('button:has-text("Télécharger certificat"), button:has-text("Download Certificate")');
      if (await downloadButton.isVisible()) {
        const downloadPromise = page.waitForEvent('download');
        await downloadButton.click();
        const download = await downloadPromise;
        
        // Verify download started
        expect(download.suggestedFilename()).toMatch(/.*certificate.*\.pdf/);
      }
    }
  });
});