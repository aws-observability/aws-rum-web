// playwright.config.js
// @ts-check
const { devices } = require('@playwright/test');

var config = {
    forbidOnly: !!process.env.CI,
    reporter: 'list',
    workers: process.env.CI ? 4 : undefined,
    testDir:
        process.env.INSTALL_METHOD === 'CDN'
            ? 'src/__smoke-test__'
            : 'src/__smoke-test-npm__',
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
