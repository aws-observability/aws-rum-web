// playwright.local.config.js
// @ts-check
const { devices } = require('@playwright/test');

const config = {
    forbidOnly: !!process.env.CI,
    testDir: 'src/__smoke-test__',
    reporter: 'list',
    retries: process.env.CI ? 2 : 2,
    timeout: 300000,
    webServer: {
        command: 'npm run server',
        url: 'http://localhost:9000/',
        timeout: 300000,
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
