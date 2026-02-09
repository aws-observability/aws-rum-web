import { test, expect } from '@playwright/test';

test.describe('Command Queue', () => {
    test('command enqueued before RUM web client loads is executed after RUM web client loads', async ({
        page
    }, testInfo) => {
        test.skip(
            testInfo.project.name === 'msedge',
            'Edge has test infrastructure setup issues'
        );

        const consoleMessages: string[] = [];

        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                consoleMessages.push(msg.text());
            }
        });

        await page.addInitScript(() => {
            window.addEventListener('unhandledrejection', function (e) {
                console.error(e.reason.message);
            });
        });

        await page.goto('/pre_load_command_queue_test.html');
        await page.waitForTimeout(2000);

        expect(consoleMessages[0]).toContain(
            'UnsupportedOperationException: unsupported_command'
        );
    });

    test('command enqueued after RUM web client loads is executed', async ({
        page
    }, testInfo) => {
        test.skip(
            testInfo.project.name === 'msedge',
            'Edge has test infrastructure setup issues'
        );

        const consoleMessages: string[] = [];

        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                consoleMessages.push(msg.text());
            }
        });

        await page.addInitScript(() => {
            window.addEventListener('unhandledrejection', function (e) {
                console.error(e.reason.message);
            });
        });

        await page.goto('/post_load_command_queue_test.html');
        await page.waitForTimeout(2000);

        expect(consoleMessages[0]).toContain(
            'UnsupportedOperationException: unsupported_command'
        );
    });
});
