import { defineConfig, devices } from '@playwright/test'

const runAllBrowsers = process.env.PLAYWRIGHT_ALL_BROWSERS === 'true' || process.env.PLAYWRIGHT_ALL_BROWSERS === '1'
const WEB_SERVER_TIMEOUT_MS = 180000
const WEB_SERVER_PORT = Number(process.env.PLAYWRIGHT_PORT ?? 43199)
const _reuseExistingServer = process.env.PLAYWRIGHT_REUSE_SERVER === 'true'
const defaultProjects = [
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
  },
]

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120 * 1000,
  expect: {
    timeout: 15000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${WEB_SERVER_PORT}`,
    trace: 'on-first-retry',
  },
  webServer: {
    command: `npm run dev:next -- --port ${WEB_SERVER_PORT}`,
    port: WEB_SERVER_PORT,
    reuseExistingServer: false,
    timeout: WEB_SERVER_TIMEOUT_MS,
    env: {
      NEXT_PUBLIC_IPC_MOCK: 'true',
      NODE_ENV: 'test',
      PORT: WEB_SERVER_PORT.toString(),
    },
    stdout: 'pipe',
    stderr: 'pipe',
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
