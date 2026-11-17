import { defineConfig, devices } from '@playwright/test';

if (
  process.env.NODE_ENV !== 'test' ||
  !process.env.DATABASE_URL ||
  !new URL(process.env.DATABASE_URL).pathname.endsWith('_test') ||
  process.env.POINTMEDIA_E2E_MANAGED !== '1'
) {
  throw new Error('Execute npm run test:e2e para usar um banco de teste isolado.');
}

const webOrigin = process.env.WEB_ORIGIN || 'http://localhost:55174';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  use: {
    baseURL: webOrigin,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
