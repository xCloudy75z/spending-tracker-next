import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(process.cwd(), '.playwright-browsers');
const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = `${externalBaseURL || 'http://127.0.0.1:4173'}/`.replace(/\/{2,}$/, '/');

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  reporter: [
    ['line'],
    ['json', { outputFile: 'evidence/reports/playwright.json' }],
  ],
  use: {
    baseURL,
    headless: true,
    locale: 'en-AE',
    timezoneId: 'Asia/Dubai',
    reducedMotion: 'reduce',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: process.env.CI
        ? { browserName: 'chromium', viewport: { width: 1440, height: 1000 } }
        : { channel: 'msedge', viewport: { width: 1440, height: 1000 } },
    },
    {
      name: 'iphone-webkit',
      use: { ...devices['iPhone 13'], browserName: 'webkit', locale: 'en-AE', timezoneId: 'Asia/Dubai' },
    },
    {
      name: 'iphone-landscape-webkit',
      use: { ...devices['iPhone 13 landscape'], browserName: 'webkit', locale: 'en-AE', timezoneId: 'Asia/Dubai' },
    },
  ],
  webServer: externalBaseURL
    ? undefined
    : {
        command: 'npm run serve',
        url: 'http://127.0.0.1:4173',
        reuseExistingServer: false,
        timeout: 30_000,
      },
});
