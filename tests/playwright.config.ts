import { defineConfig } from '@playwright/test';

export default defineConfig({
  timeout: 30 * 1000,
  testDir: './tests',
  use: {
    headless: false,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 10 * 1000,
    screenshot: 'on',
    video: 'on',
  },
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
});