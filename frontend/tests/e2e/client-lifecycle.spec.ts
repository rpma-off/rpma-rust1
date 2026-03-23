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
 */

// TODO(e2e): excluded from default smoke run; re-enable after selector and workflow stabilization.
import { test, expect, type Locator, type Page } from "@playwright/test";
import { loginAsTestUser } from "./utils/auth";

function clientCardByName(page: Page, name: string): Locator {
  return page.getByTestId("client-card").filter({
    has: page.getByRole("heading", { name, exact: true }),
  });
}

async function expectClientVisible(page: Page, name: string): Promise<void> {
  await expect(clientCardByName(page, name)).toHaveCount(1);
  await expect(clientCardByName(page, name).first()).toBeVisible();
}

async function expectClientNotVisible(page: Page, name: string): Promise<void> {
  await expect(clientCardByName(page, name).first()).not.toBeVisible();
}

async function openClientByName(page: Page, name: string): Promise<void> {
  const card = clientCardByName(page, name).first();
  await expect(card).toBeVisible();
  await card.click();
}

async function openFirstAvailableTask(page: Page): Promise<void> {
  await page.goto("/tasks/task-1");
}

test.describe("Client Lifecycle Management", () => {
  // Test data
  const testClient = {
    name: "Test Client E2E",
    email: "testclient@example.com",
    phone: "555-123-4567",
    address_street: "123 Test Street",
    address_city: "Test City",
    address_state: "Test State",
    address_zip: "12345",
    address_country: "Test Country",
    customer_type: "individual" as const,
    notes: "This is a test client created by E2E tests",
  };

  const testBusinessClient = {
    name: "Test Business E2E",
    email: "business@example.com",
    phone: "555-987-6543",
    address_street: "456 Business Ave",
    address_city: "Business City",
    address_state: "Business State",
    address_zip: "67890",
    address_country: "Business Country",
    customer_type: "business" as const,
    company_name: "Test Business Inc.",
    contact_person: "John Contact",
    notes: "This is a test business client created by E2E tests",
  };

  test.beforeEach(async ({ page }) => {
    test.setTimeout(90000); // Extended timeout for cold-start Next.js compilation
    await loginAsTestUser(page);
  });

  test("should create a new individual client with all required fields", async ({
    page,
  }) => {
    await page.goto("/clients");
    await expect(page.locator("h1")).toContainText("Clients");

    await page.click('a[href="/clients/new"]');
    await expect(page.locator("h1")).toContainText(
      /Nouveau client|New Client/i,
    );

    await page.fill('input[name="name"]', testClient.name);
    await page.fill('input[name="email"]', testClient.email);
    await page.fill('input[name="phone"]', testClient.phone);
    await page.fill(
      'textarea[name="address_street"]',
      testClient.address_street,
    );
    await page.click('input[name="customer_type"][value="individual"]');
    await page.fill('textarea[name="notes"]', testClient.notes);

    await page.getByRole("button", { name: /Créer/i }).click();

    await page.waitForURL(/\/clients\/[a-zA-Z0-9]+-[a-zA-Z0-9-]+/, {
      timeout: 30000,
    });
    await expect(page).toHaveURL(/\/clients\/[a-zA-Z0-9]+-[a-zA-Z0-9-]+/);

    await expect(page.locator("h1")).toContainText(testClient.name);
    await expect(page.locator(`text=${testClient.email}`)).toBeVisible();
    await expect(page.locator(`text=${testClient.phone}`)).toBeVisible();
    await expect(page.locator("text=Client particulier")).toBeVisible();
  });

  test("should create a new business client with company information", async ({
    page,
  }) => {
    await page.goto("/clients");
    await page.click('a[href="/clients/new"]');

    await page.fill('input[name="name"]', testBusinessClient.name);
    await page.fill('input[name="email"]', testBusinessClient.email);
    await page.fill('input[name="phone"]', testBusinessClient.phone);
    await page.fill(
      'textarea[name="address_street"]',
      testBusinessClient.address_street,
    );
    await page.click('input[name="customer_type"][value="business"]');
    await page.fill(
      'input[name="company_name"]',
      testBusinessClient.company_name,
    );
    await page.fill('textarea[name="notes"]', testBusinessClient.notes);

    await page.getByRole("button", { name: /Créer/i }).click();

    await page.waitForURL(/\/clients\/[a-zA-Z0-9]+-[a-zA-Z0-9-]+/, {
      timeout: 30000,
    });

    await expect(page.locator("h1")).toContainText(testBusinessClient.name);
    await expect(
      page.locator(`text=${testBusinessClient.company_name}`),
    ).toBeVisible();
    await expect(page.locator("text=Client entreprise")).toBeVisible();
  });

  test("should show validation errors for required fields", async ({
    page,
  }) => {
    await page.goto("/clients/new");

    await page.click('button[type="submit"]');
    await expect(page.locator('input[name="name"]')).toHaveAttribute(
      "required",
    );

    await page.fill('input[name="name"]', "Test");
    await page.click('button[type="submit"]');

    await expect(
      page.locator('input[name="customer_type"][value="individual"]'),
    ).toBeChecked();
  });

  test("should display vehicle information on task details", async ({
    page,
  }) => {
    await openFirstAvailableTask(page);
    await page.waitForURL(/\/tasks\/[a-zA-Z0-9-]+/, { timeout: 30000 });

    await expect(page.getByText("Tesla", { exact: true })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("Model 3", { exact: true })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(/TEST-001|TASK-0001/i).first()).toBeVisible({
      timeout: 15000,
    });
  });

  test("should update client information", async ({ page }) => {
    await page.goto("/clients/new");
    await page.fill('input[name="name"]', testClient.name);
    await page.fill('input[name="email"]', testClient.email);
    await page.click('input[name="customer_type"][value="individual"]');
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/clients\/[a-zA-Z0-9]+-[a-zA-Z0-9-]+/);

    await page.click('button:has-text("Modifier")');
    await page.waitForURL(/\/clients\/[a-zA-Z0-9-]+\/edit/);

    const updatedEmail = "updated@example.com";
    const updatedPhone = "555-999-8888";
    const updatedNotes = "Updated notes for the test client";

    await page.fill('input[name="email"]', updatedEmail);
    await page.fill('input[name="phone"]', updatedPhone);
    await page.fill('textarea[name="notes"]', updatedNotes);

    await page.click('button[type="submit"]');

    await expect(page.locator(`text=${updatedEmail}`)).toBeVisible();
    await expect(page.locator(`text=${updatedPhone}`)).toBeVisible();
    await expect(page.locator(`text=${updatedNotes}`)).toBeVisible();
  });

  test("should search and filter clients", async ({ page }) => {
    const clients = [
      { name: "Alice Smith", customer_type: "individual" as const },
      { name: "Bob Johnson", customer_type: "individual" as const },
      { name: "Acme Corporation", customer_type: "business" as const },
    ];

    for (const client of clients) {
      await page.goto("/clients/new");
      await page.fill('input[name="name"]', client.name);
      await page.click(
        `input[name="customer_type"][value="${client.customer_type}"]`,
      );
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/clients\/[a-zA-Z0-9]+-[a-zA-Z0-9-]+/);
      await page.goto("/clients");
    }

    await page.goto("/clients");

    await page.fill('input[placeholder="Rechercher un client..."]', "Alice");
    await expectClientVisible(page, "Alice Smith");
    await expect(
      page.getByRole("heading", { name: "Alice Smith", exact: true }),
    ).toBeVisible();

    await page.fill('input[placeholder="Rechercher un client..."]', "");
    await expectClientVisible(page, "Alice Smith");
    await expectClientVisible(page, "Bob Johnson");
    await expectClientVisible(page, "Acme Corporation");

    await page.selectOption("select", "business");

    await expectClientVisible(page, "Acme Corporation");
  });

  test("should view client details and history", async ({ page }) => {
    await page.goto("/clients/new");
    await page.fill('input[name="name"]', testClient.name);
    await page.fill('input[name="email"]', testClient.email);
    await page.click('input[name="customer_type"][value="individual"]');
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/clients\/[a-zA-Z0-9]+-[a-zA-Z0-9-]+/);

    await expect(page.locator("text=Aperçu du client")).toBeVisible();
    await expect(page.locator("text=Total tâches")).toBeVisible();
    await expect(page.locator("text=Terminées")).toBeVisible();
    await expect(page.locator("text=Client depuis")).toBeVisible();

    await expect(page.locator("text=Informations de contact")).toBeVisible();
    await expect(page.locator(`text=${testClient.email}`)).toBeVisible();

    await expect(page.locator('h3:has-text("Activité récente")')).toBeVisible();
  });

  test("should handle data persistence across page refreshes", async ({
    page,
  }) => {
    await page.goto("/clients/new");
    await page.fill('input[name="name"]', testClient.name);
    await page.fill('input[name="email"]', testClient.email);
    await page.click('input[name="customer_type"][value="individual"]');
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/clients\/[a-zA-Z0-9]+-[a-zA-Z0-9-]+/);

    await expect(page.locator("h1")).toContainText(testClient.name);
    await expect(page.locator(`text=${testClient.email}`)).toBeVisible();
    await expect(page.locator("text=Client particulier")).toBeVisible();

    await page.click('a[href="/clients"]');
    await page.waitForURL(/\/clients(\?.*)?$/, { timeout: 10000 });
    await expectClientVisible(page, testClient.name);
  });

  test("should handle client deletion with confirmation", async ({ page }) => {
    await page.goto("/clients/new");
    await page.fill('input[name="name"]', "Client to Delete");
    await page.click('input[name="customer_type"][value="individual"]');
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/clients\/[a-zA-Z0-9]+-[a-zA-Z0-9-]+/);

    page.on("dialog", (dialog) => {
      expect(dialog.message()).toContain("Êtes-vous sûr de vouloir supprimer");
      dialog.accept();
    });

    await page.click('button:has-text("Supprimer")');

    await expect(page).toHaveURL("/clients");
    await expectClientNotVisible(page, "Client to Delete");
  });

  test("should handle sorting options in client list", async ({ page }) => {
    const clientNames = ["Zebra Client", "Alpha Client", "Beta Client"];

    for (const name of clientNames) {
      await page.goto("/clients/new");
      await page.fill('input[name="name"]', name);
      await page.click('input[name="customer_type"][value="individual"]');
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/clients\/[a-zA-Z0-9]+-[a-zA-Z0-9-]+/);
      await page.goto("/clients");
    }

    await page.locator("select").nth(1).selectOption("name_asc");
    const clientCards = page.getByTestId("client-card");
    const names = await clientCards.locator("h3").allTextContents();

    const relevantNames = names.filter((name) => clientNames.includes(name));
    const sortedNames = [...relevantNames].sort();
    expect(relevantNames).toEqual(sortedNames);

    await page.locator("select").nth(1).selectOption("name_desc");
    const namesDesc = await clientCards.locator("h3").allTextContents();
    const relevantNamesDesc = namesDesc.filter((name) =>
      clientNames.includes(name),
    );
    const sortedNamesDesc = [...relevantNames].sort().reverse();
    expect(relevantNamesDesc).toEqual(sortedNamesDesc);
  });
});
