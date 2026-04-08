import { defineConfig, devices } from '@playwright/test';

// Shared settings
const shared = {
    testMatch: '**/__integ__/**/*.spec.ts',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html' as const,
    use: {
        trace: 'on-first-retry' as const
    }
};

// aws-rum-web runs all integ tests (core + plugins + remote-config)
const fullTestDir = './packages/core/src';

// aws-rum-slim only runs core integ tests (no plugins, no remote-config)
// Slim loads only PageViewPlugin by default — plugin-specific and
// remote-config tests are not applicable.
const slimTestDir = './packages/core/src';
const slimTestIgnore = [
    '**/plugins/event-plugins/__integ__/**',
    '**/remote-config/__integ__/**',
    '**/__integ__/CommandQueue.spec.ts'
];

export default defineConfig({
    ...shared,
    projects: [
        // aws-rum-web (full distribution)
        {
            name: 'aws-rum-web:chromium',
            testDir: fullTestDir,
            use: {
                ...devices['Desktop Chrome'],
                baseURL: 'http://localhost:8080'
            }
        },
        {
            name: 'aws-rum-web:firefox',
            testDir: fullTestDir,
            use: {
                ...devices['Desktop Firefox'],
                baseURL: 'http://localhost:8080'
            }
        },
        {
            name: 'aws-rum-web:webkit',
            testDir: fullTestDir,
            use: {
                ...devices['Desktop Safari'],
                baseURL: 'http://localhost:8080'
            }
        },
        {
            name: 'aws-rum-web:msedge',
            testDir: fullTestDir,
            use: {
                ...devices['Desktop Edge'],
                channel: 'msedge',
                baseURL: 'http://localhost:8080'
            }
        },
        // aws-rum-slim (no plugins, no remote-config, no CommandQueue)
        {
            name: 'aws-rum-slim:chromium',
            testDir: slimTestDir,
            testIgnore: slimTestIgnore,
            use: {
                ...devices['Desktop Chrome'],
                baseURL: 'http://localhost:8081'
            }
        },
        {
            name: 'aws-rum-slim:firefox',
            testDir: slimTestDir,
            testIgnore: slimTestIgnore,
            use: {
                ...devices['Desktop Firefox'],
                baseURL: 'http://localhost:8081'
            }
        },
        {
            name: 'aws-rum-slim:webkit',
            testDir: slimTestDir,
            testIgnore: slimTestIgnore,
            use: {
                ...devices['Desktop Safari'],
                baseURL: 'http://localhost:8081'
            }
        },
        {
            name: 'aws-rum-slim:msedge',
            testDir: slimTestDir,
            testIgnore: slimTestIgnore,
            use: {
                ...devices['Desktop Edge'],
                channel: 'msedge',
                baseURL: 'http://localhost:8081'
            }
        }
    ],
    webServer: [
        {
            command: 'http-server ./packages/web/build/dev -s -p 8080',
            port: 8080,
            reuseExistingServer: !process.env.CI
        },
        {
            command: 'http-server ./packages/slim/build/dev -s -p 8081',
            port: 8081,
            reuseExistingServer: !process.env.CI
        }
    ]
});
