import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './packages',
    testMatch: '**/__integ__/**/*.spec.ts',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        trace: 'on-first-retry'
    },
    projects: [
        // aws-rum-web (full distribution)
        {
            name: 'aws-rum-web:chromium',
            use: {
                ...devices['Desktop Chrome'],
                baseURL: 'http://localhost:8080'
            }
        },
        {
            name: 'aws-rum-web:firefox',
            use: {
                ...devices['Desktop Firefox'],
                baseURL: 'http://localhost:8080'
            }
        },
        {
            name: 'aws-rum-web:webkit',
            use: {
                ...devices['Desktop Safari'],
                baseURL: 'http://localhost:8080'
            }
        },
        // aws-rum-web (edge)
        {
            name: 'aws-rum-web:msedge',
            use: {
                ...devices['Desktop Edge'],
                channel: 'msedge',
                baseURL: 'http://localhost:8080'
            }
        },
        // aws-rum-slim
        {
            name: 'aws-rum-slim:chromium',
            use: {
                ...devices['Desktop Chrome'],
                baseURL: 'http://localhost:8081'
            }
        },
        {
            name: 'aws-rum-slim:firefox',
            use: {
                ...devices['Desktop Firefox'],
                baseURL: 'http://localhost:8081'
            }
        },
        {
            name: 'aws-rum-slim:webkit',
            use: {
                ...devices['Desktop Safari'],
                baseURL: 'http://localhost:8081'
            }
        },
        // aws-rum-slim (edge)
        {
            name: 'aws-rum-slim:msedge',
            use: {
                ...devices['Desktop Edge'],
                channel: 'msedge',
                baseURL: 'http://localhost:8081'
            }
        }
    ],
    webServer: [
        {
            command: 'http-server ./packages/aws-rum-web/build/dev -s -p 8080',
            port: 8080,
            reuseExistingServer: !process.env.CI
        },
        {
            command: 'http-server ./packages/aws-rum-slim/build/dev -s -p 8081',
            port: 8081,
            reuseExistingServer: !process.env.CI
        }
    ]
});
