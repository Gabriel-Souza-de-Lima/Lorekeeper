import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: Boolean(process.env.CI),
  use: {
    browserName: 'chromium',
    launchOptions: {
      executablePath: process.env.LOREKEEPER_CHROMIUM_PATH || undefined,
    },
    trace: 'retain-on-failure',
  },
})
