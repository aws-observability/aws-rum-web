// playwright.config.js
// @ts-check
const { devices } = require('@playwright/test');

const config = {
    forbidOnly: !!process.env.CI,
    testDir: 'src/__smoke-test__',
    retries: process.env.CI ? 2 : 2,
    timeout: 300000,
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
