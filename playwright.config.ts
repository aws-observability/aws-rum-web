// playwright.config.js
// @ts-check
const { devices } = require('@playwright/test');

let config;
if (process.env.INSTALL_METHOD === 'CDN') {
    config = {
        forbidOnly: !!process.env.CI,
        reporter: 'list',
        workers: process.env.CI ? 4 : undefined,
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
} else {
    config = {
        forbidOnly: !!process.env.CI,
        reporter: 'list',
        workers: process.env.CI ? 4 : undefined,
        testDir: 'src/__smoke-test-npm__',
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
}

module.exports = config;
