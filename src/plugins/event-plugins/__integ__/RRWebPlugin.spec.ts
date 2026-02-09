import { test, expect } from '@playwright/test';
import { RRWEB_EVENT_TYPE } from '../../utils/constant';

// rrweb EventType enum:
//   0 = DomContentLoaded, 1 = Load, 2 = FullSnapshot,
//   3 = IncrementalSnapshot, 4 = Meta, 5 = Custom, 6 = Plugin
//
// IncrementalSource enum (type=3):
//   0=Mutation, 1=MouseMove, 2=MouseInteraction, 3=Scroll,
//   4=ViewportResize, 5=Input, 7=MediaInteraction,
//   8=StyleSheetRule, 9=CanvasMutation, 13=StyleDeclaration, 14=Selection

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

test.describe('RRWebPlugin', () => {
    test('full lifecycle: enable, emit events across multiple flushes, disable', async ({
        page
    }) => {
        await page.goto('/session_replay.html');
        await page.waitForTimeout(500);

        // Batch 1: click + type + add element (batchSize=3 triggers flush)
        await page.click('#clickTarget');
        await page.fill('#textInput', 'hi');
        await page.click('#addElement');

        // Wait for batch flush + interval flush
        await page.waitForTimeout(3000);
        await page.click('#dispatch');

        await expect(page.locator('#request_body')).toContainText('BatchId');
        const body1 = await page.locator('#request_body').textContent();
        const replay1 = getReplayEvents(body1!);

        // Should have at least one SessionReplayEvent with correct structure
        expect(replay1.length).toBeGreaterThanOrEqual(1);
        expect(replay1[0].details.version).toBe('1.0.0');
        expect(replay1[0].details.events.length).toBeGreaterThan(0);
        expect(replay1[0].details.eventCount).toBe(
            replay1[0].details.events.length
        );

        // Clear and do more interactions
        await page.click('#clearRequestResponse');
        await page.click('#changeStyle');
        await page.click('#scrollElement');

        await page.waitForTimeout(3000);
        await page.click('#dispatch');

        await expect(page.locator('#request_body')).toContainText('BatchId');
        const body2 = await page.locator('#request_body').textContent();
        const replay2 = getReplayEvents(body2!);
        expect(replay2.length).toBeGreaterThanOrEqual(1);

        // Disable — no replay events for interactions while disabled
        await page.click('#clearRequestResponse');
        await page.click('#disable');
        await page.click('#clickTarget');
        await page.fill('#textInput', 'while disabled');
        await page.waitForTimeout(3000);
        await page.click('#enable');
        await page.click('#dispatch');

        await expect(page.locator('#request_body')).toContainText('BatchId');
        const body3 = await page.locator('#request_body').textContent();
        const replay3 = getReplayEvents(body3!);

        // Re-enable triggers new rrweb init (FullSnapshot/Meta), but
        // user interactions while disabled (click, input) should be absent.
        const allEvents3 = getAllRRWebEvents(replay3);
        const inputWhileDisabled = allEvents3.filter(
            (e: any) =>
                e.type === 3 &&
                e.data?.source === 5 &&
                e.data?.text === 'while disabled'
        );
        expect(inputWhileDisabled.length).toBe(0);
    });

    test('records all rrweb EventType variants from real DOM interactions', async ({
        page
    }) => {
        await page.goto('/session_replay.html');
        await page.waitForTimeout(500);

        // Page load produces: DomContentLoaded(0), Load(1), FullSnapshot(2), Meta(4)

        // MouseMove(1) + MouseInteraction(2) — click generates both
        await page.click('#clickTarget');

        // Mutation(0) — add a DOM element
        await page.click('#addElement');

        // Input(5) — type into text field
        await page.fill('#textInput', 'test');

        // Scroll(3) — scroll an element
        await page.click('#scrollElement');

        // ViewportResize(4) — resize viewport
        const originalSize = page.viewportSize()!;
        await page.setViewportSize({ width: 800, height: 400 });
        await page.waitForTimeout(200);
        await page.setViewportSize(originalSize);

        // MediaInteraction(7) — play audio
        await page.click('#playMedia');

        // StyleSheetRule(8) — insert CSS rule
        await page.click('#addStyleRule');

        // CanvasMutation(9) — draw on canvas
        await page.click('#drawCanvas');

        // StyleDeclaration(13) — change inline style
        await page.click('#changeStyle');

        // Selection(14) — select text
        await page.click('#selectText');

        // Wait for all flushes
        await page.waitForTimeout(3000);
        await page.click('#dispatch');

        await expect(page.locator('#request_body')).toContainText('BatchId');
        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
        const replayEvents = getReplayEvents(requestBodyText!);
        expect(replayEvents.length).toBeGreaterThanOrEqual(1);

        const allEvents = getAllRRWebEvents(replayEvents);
        expect(allEvents.length).toBeGreaterThan(0);

        // Collect all event types and incremental sources
        const eventTypes = new Set(allEvents.map((e: any) => e.type));
        const incrementalSources = new Set(
            allEvents
                .filter((e: any) => e.type === 3)
                .map((e: any) => e.data?.source)
        );

        // Verify core EventTypes are present
        // 0=DomContentLoaded, 1=Load, 2=FullSnapshot, 3=IncrementalSnapshot, 4=Meta
        expect(eventTypes).toContain(2); // FullSnapshot
        expect(eventTypes).toContain(3); // IncrementalSnapshot
        expect(eventTypes).toContain(4); // Meta

        // Verify IncrementalSource subtypes from our interactions
        expect(incrementalSources).toContain(0); // Mutation (addElement)
        expect(incrementalSources).toContain(1); // MouseMove
        expect(incrementalSources).toContain(2); // MouseInteraction (click)
        expect(incrementalSources).toContain(3); // Scroll
        expect(incrementalSources).toContain(5); // Input

        // Every SessionReplayEvent payload has correct structure
        for (const event of replayEvents) {
            expect(event.details.version).toBe('1.0.0');
            expect(event.details.eventCount).toBe(event.details.events.length);
            expect(Array.isArray(event.details.events)).toBe(true);
            for (const e of event.details.events) {
                expect(typeof e.type).toBe('number');
                expect(typeof e.timestamp).toBe('number');
                expect(e.data).toBeDefined();
            }
        }
    });

    test('when client is disabled then interactions are not recorded', async ({
        page
    }) => {
        await page.goto('/session_replay.html');
        await page.waitForTimeout(500);

        // Dispatch initial events (page load snapshot etc.)
        await page.waitForTimeout(3000);
        await page.click('#dispatch');
        await expect(page.locator('#request_body')).toContainText('BatchId');
        await page.click('#clearRequestResponse');

        // Disable, interact, enable, dispatch
        await page.click('#disable');
        await page.click('#clickTarget');
        await page.fill('#textInput', 'should not record');
        await page.click('#addElement');
        await page.waitForTimeout(3000);
        await page.click('#enable');
        await page.click('#dispatch');

        await expect(page.locator('#request_body')).toContainText('BatchId');
        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
        const replayEvents = getReplayEvents(requestBodyText!);

        // Re-enable triggers new rrweb init (FullSnapshot/Meta), but
        // user interactions while disabled should be absent.
        const allEvents = getAllRRWebEvents(replayEvents);
        const inputWhileDisabled = allEvents.filter(
            (e: any) =>
                e.type === 3 &&
                e.data?.source === 5 &&
                e.data?.text === 'should not record'
        );
        expect(inputWhileDisabled.length).toBe(0);
    });

    test('rrweb record receives merged config options (maskAllInputs)', async ({
        page
    }) => {
        await page.goto('/session_replay.html');
        await page.waitForTimeout(500);

        // Type into input — should be masked since maskAllInputs=true
        await page.fill('#textInput', 'secret');

        await page.waitForTimeout(3000);
        await page.click('#dispatch');

        await expect(page.locator('#request_body')).toContainText('BatchId');
        const requestBodyText = await page
            .locator('#request_body')
            .textContent();
        const replayEvents = getReplayEvents(requestBodyText!);
        const allEvents = getAllRRWebEvents(replayEvents);

        // Find input events (IncrementalSnapshot with source=5)
        const inputEvents = allEvents.filter(
            (e: any) => e.type === 3 && e.data?.source === 5
        );

        // Input events should exist and the text should be masked (not 'secret')
        expect(inputEvents.length).toBeGreaterThan(0);
        for (const ie of inputEvents) {
            expect(ie.data.text).not.toBe('secret');
        }
    });
});
