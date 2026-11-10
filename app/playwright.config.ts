import { defineConfig } from '@playwright/test';

const baseURL = process.env.ELARION_E2E_URL ?? 'http://127.0.0.1:4173';

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  timeout: 90000,
  use: { baseURL, channel: process.env.ELARION_BROWSER, trace: 'retain-on-failure', viewport: { width: 1440, height: 960 } },
  webServer: process.env.ELARION_E2E_URL ? undefined : { command: 'npm run preview', url: baseURL, timeout: 15000, reuseExistingServer: false },
});
