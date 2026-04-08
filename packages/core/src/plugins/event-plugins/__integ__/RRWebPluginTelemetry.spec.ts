import { test, expect } from '@playwright/test';
import { RRWEB_EVENT_TYPE } from '../../utils/constant';

const getReplayEvents = (requestBodyText: string) => {
    const body = JSON.parse(requestBodyText || '{}');
    return body.RumEvents.filter((e: any) => e.type === RRWEB_EVENT_TYPE).map(
        (e: any) => ({
            ...e,
            details: JSON.parse(e.details)
        })
    );
};

const getAllRRWebEvents = (replayEvents: any[]) =>
    replayEvents.flatMap((e: any) => e.details.events);

test.describe('RRWebPlugin via telemetries functor', () => {
    test('when replay telemetry is configured then rrweb events are recorded', async ({
        page
    }) => {
        await page.goto('/session_replay_telemetry.html');
        await page.waitForTimeout(500);

        // Trigger interactions to generate rrweb events
        await page.click('#clickTarget');
        await page.fill('#textInput', 'hello');
        await page.click('#addElement');

        // Wait for flush
        await page.waitForTimeout(3000);
        await page.click('#dispatch');

        await expect(page.locator('#request_body')).toContainText('BatchId');
        const body = await page.locator('#request_body').textContent();
        const replayEvents = getReplayEvents(body!);

        expect(replayEvents.length).toBeGreaterThanOrEqual(1);
        expect(replayEvents[0].details.version).toBe('1.0.0');
        expect(replayEvents[0].details.events.length).toBeGreaterThan(0);

        // Verify FullSnapshot and IncrementalSnapshot present
        const allEvents = getAllRRWebEvents(replayEvents);
        const eventTypes = new Set(allEvents.map((e: any) => e.type));
        expect(eventTypes).toContain(2); // FullSnapshot
        expect(eventTypes).toContain(3); // IncrementalSnapshot
    });

    test('when replay config is passed via telemetries then maskAllInputs is applied', async ({
        page
    }) => {
        await page.goto('/session_replay_telemetry.html');
        await page.waitForTimeout(500);

        await page.fill('#textInput', 'secret');

        await page.waitForTimeout(3000);
        await page.click('#dispatch');

        await expect(page.locator('#request_body')).toContainText('BatchId');
        const body = await page.locator('#request_body').textContent();
        const replayEvents = getReplayEvents(body!);
        const allEvents = getAllRRWebEvents(replayEvents);

        const inputEvents = allEvents.filter(
            (e: any) => e.type === 3 && e.data?.source === 5
        );

        expect(inputEvents.length).toBeGreaterThan(0);
        for (const ie of inputEvents) {
            expect(ie.data.text).not.toBe('secret');
        }
    });
});
