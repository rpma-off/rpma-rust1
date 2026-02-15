import { defineConfig, devices } from '@playwright/test'

const runAllBrowsers = process.env.PLAYWRIGHT_ALL_BROWSERS === 'true' || process.env.PLAYWRIGHT_ALL_BROWSERS === '1'
const defaultProjects = [
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
  },
]

export default defineConfig({
  testDir: './tests/e2e',
  testIgnore: [
    'client-lifecycle.spec.ts',
    'configuration-smoke.spec.ts',
    'connectivity-smoke.spec.ts',
    'intervention-management.spec.ts',
    'inventory-management.spec.ts',
  ],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_IPC_MOCK: 'true',
      NODE_ENV: 'test'
    }
  },
  projects: runAllBrowsers
    ? [
        ...defaultProjects,
        {
          name: 'firefox',
          use: { ...devices['Desktop Firefox'] },
        },
        {
          name: 'webkit',
          use: { ...devices['Desktop Safari'] },
        },
      ]
    : defaultProjects,
})
