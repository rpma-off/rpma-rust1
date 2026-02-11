import { test, expect } from '@playwright/test';
import { resetMockDb, setMockFailure, setMockDelay } from './utils/mock';

test.describe('User Authentication Flow', () => {
  test.beforeEach(async ({ page, context }) => {
    // Clear any existing auth state
    await context.clearCookies();
    await context.clearPermissions();
    await page.goto('/login');
    await resetMockDb(page);
  });

  test('should display login page with all required elements', async ({ page }) => {
    await page.goto('/login');
    
    // Check page title
    await expect(page).toHaveTitle(/RPMA V2/);
    
    // Check main heading
    await expect(page.locator('h2')).toContainText('Connexion');
    
    // Check form elements
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Check form labels
    await expect(page.locator('label[for="email"]')).toContainText('Adresse email');
    await expect(page.locator('label[for="password"]')).toContainText('Mot de passe');
    
    // Check signup link
    await expect(page.locator('a[href="/signup"]')).toBeVisible();
    await expect(page.locator('text=Vous n\'avez pas de compte ?')).toBeVisible();
    
    // Check branding
    await expect(page.locator('text=RPMA V2 - Système de gestion PPF')).toBeVisible();
  });

  test('should validate form fields and show appropriate error messages', async ({ page }) => {
    await page.goto('/login');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Check for HTML5 validation or custom validation
    const emailInput = page.locator('input[name="email"]');
    await expect(emailInput).toHaveAttribute('required');
    
    const passwordInput = page.locator('input[name="password"]');
    await expect(passwordInput).toHaveAttribute('required');
    
    // Test invalid email format
    await emailInput.fill('invalid-email');
    await page.click('button[type="submit"]');
    
    // Check for email validation error
    await expect(page.locator('text=Email invalide')).toBeVisible();
    
    // Test short password
    await emailInput.fill('test@example.com');
    await passwordInput.fill('short');
    await page.click('button[type="submit"]');
    
    // Check for password validation error
    await expect(page.locator('text=8 caractères minimum')).toBeVisible();
  });

  test('should show error message for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill form with invalid credentials
    await page.fill('input[name="email"]', 'nonexistent@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for error message
    await expect(page.locator('text=Email ou mot de passe incorrect')).toBeVisible();
    
    // Verify user stays on login page
    await expect(page).toHaveURL('/login');
    
    // Verify form fields are not cleared
    await expect(page.locator('input[name="email"]')).toHaveValue('nonexistent@example.com');
    await expect(page.locator('input[name="password"]')).toHaveValue('wrongpassword');
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill form with valid credentials (assuming test user exists)
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'testpassword');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard or tasks page
    await page.waitForURL(/\/dashboard|\/tasks/, { timeout: 10000 });
    
    // Verify successful login by checking for dashboard or tasks page elements
    const isDashboard = await page.locator('h1:has-text("Tableau de bord")').isVisible();
    const isTasksPage = await page.locator('h1:has-text("Jobs")').isVisible();
    
    expect(isDashboard || isTasksPage).toBeTruthy();
    
    // Check for user-specific elements in navigation
    await expect(page.locator('text=Profil')).toBeVisible();
    await expect(page.locator('text=Déconnexion')).toBeVisible();
  });

  test('should toggle password visibility', async ({ page }) => {
    await page.goto('/login');
    
    const passwordInput = page.locator('input[name="password"]');
    const toggleButton = page.locator('button:has(svg)').first(); // Eye icon button
    
    // Initially password should be hidden
    await expect(passwordInput).toHaveAttribute('type', 'password');
    
    // Click to show password
    if (await toggleButton.isVisible()) {
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'text');
      
      // Click to hide password again
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    }
  });

  test('should redirect authenticated users away from login page', async ({ page }) => {
    // First login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'testpassword');
    await page.click('button[type="submit"]');
    
    // Wait for successful login
    await page.waitForURL(/\/dashboard|\/tasks/, { timeout: 10000 });
    
    // Try to go back to login page
    await page.goto('/login');
    
    // Should redirect to dashboard or tasks page
    await page.waitForURL(/\/dashboard|\/tasks/, { timeout: 5000 });
  });

  test('should handle network errors gracefully', async ({ page }) => {
    await setMockFailure(page, 'auth_login', 'Erreur lors de la connexion');
    
    // Fill form
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'testpassword');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should show network error message
    await expect(page.locator('text=Erreur lors de la connexion')).toBeVisible();
  });

  test('should preserve form state after validation errors', async ({ page }) => {
    await page.goto('/login');
    
    // Fill form with invalid credentials
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for error message
    await expect(page.locator('text=Email ou mot de passe incorrect')).toBeVisible();
    
    // Check that form values are preserved
    await expect(page.locator('input[name="email"]')).toHaveValue('test@example.com');
    await expect(page.locator('input[name="password"]')).toHaveValue('wrongpassword');
  });

  test('should handle session expiration', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'testpassword');
    await page.click('button[type="submit"]');
    
    // Wait for successful login
    await page.waitForURL(/\/dashboard|\/tasks/, { timeout: 10000 });
    
    // Clear cookies to simulate session expiration
    await page.context().clearCookies();
    
    // Try to access protected route
    await page.goto('/tasks');
    
    // Should redirect to login page
    await page.waitForURL('/login', { timeout: 5000 });
  });

  test('should handle keyboard navigation and form submission', async ({ page }) => {
    await page.goto('/login');
    
    // Tab through form fields
    await page.keyboard.press('Tab');
    await expect(page.locator('input[name="email"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('input[name="password"]')).toBeFocused();
    
    // Fill form using keyboard
    await page.keyboard.type('test@example.com');
    await page.keyboard.press('Tab');
    await page.keyboard.type('testpassword');
    
    // Submit using Enter key
    await page.keyboard.press('Enter');
    
    // Should attempt login
    await page.waitForURL(/\/dashboard|\/tasks/, { timeout: 10000 });
  });

  test('should display loading state during authentication', async ({ page }) => {
    await setMockDelay(page, 'auth_login', 2000);
    
    // Fill form
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'testpassword');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Check for loading state
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
    await expect(page.locator('text=Connexion en cours...')).toBeVisible();
    
    // Wait for loading to complete
    await page.waitForURL(/\/dashboard|\/tasks/, { timeout: 15000 });
  });

  test('should navigate to signup page when clicking signup link', async ({ page }) => {
    await page.goto('/login');
    
    // Click signup link
    await page.click('a[href="/signup"]');
    
    // Should navigate to signup page
    await page.waitForURL('/signup');
    await expect(page.locator('text=Inscription')).toBeVisible();
    await expect(page.locator('text=Créer un compte')).toBeVisible();
  });
});
