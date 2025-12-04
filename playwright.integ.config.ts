import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './src',
    testMatch: '**/__integ__/**/*.spec.ts',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        baseURL: 'http://localhost:8080',
        trace: 'on-first-retry'
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] }
        },
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] }
        },
        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] }
        }
    ],
    webServer: {
        command: 'http-server ./build/dev -s -p 8080',
        port: 8080,
        reuseExistingServer: !process.env.CI
    }
});
