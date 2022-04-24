// playwright.local.config.js
// @ts-check
const { devices } = require('@playwright/test');

const config = {
    forbidOnly: !!process.env.CI,
    testDir: 'src/__smoke-test__',
    retries: process.env.CI ? 2 : 0,
    webServer: {
        command: 'npm run server',
        url: 'http://localhost:8080/',
        timeout: 120 * 1000,
        reuseExistingServer: !process.env.CI
    },
    use: {
        trace: 'on-first-retry'
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] }
        }
    ]
};

module.exports = config;
