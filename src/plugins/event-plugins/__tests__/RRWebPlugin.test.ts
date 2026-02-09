/**
 * @jest-environment jsdom
 */
import {
    RRWebPlugin,
    RRWEB_CONFIG_PROD,
    RRWEB_CONFIG_DEV
} from '../RRWebPlugin';
import { context, record, getSession } from '../../../test-utils/test-utils';
import { RRWEB_EVENT_TYPE } from '../../utils/constant';
import type { SessionReplayEvent } from '../../../events/session-replay-event';
import { record as rrwebRecord } from 'rrweb';

jest.mock('rrweb', () => ({
    record: jest.fn()
}));

const mockRrwebRecord = rrwebRecord as jest.MockedFunction<typeof rrwebRecord>;

const mockEvent = (type = 2, timestamp = Date.now()) => ({
    type,
    timestamp,
    data: {}
});

describe('RRWebPlugin', () => {
    let plugin: RRWebPlugin;

    beforeEach(() => {
        jest.useFakeTimers();
        record.mockClear();
        getSession.mockClear();
        mockRrwebRecord.mockClear();
        getSession.mockReturnValue({
            sessionId: 'abc123',
            record: true,
            eventCount: 0
        });
        // rrweb record returns a stop function
        mockRrwebRecord.mockReturnValue(jest.fn());
        plugin = new RRWebPlugin();
    });

    afterEach(() => {
        plugin.disable();
        jest.useRealTimers();
    });

    test('uses RRWEB_CONFIG_PROD by default', () => {
        const p = new RRWebPlugin();
        expect(p['config']).toEqual(RRWEB_CONFIG_PROD);
    });

    test('RRWEB_CONFIG_PROD has expected values', () => {
        expect(RRWEB_CONFIG_PROD).toEqual({
            additionalSampleRate: 1.0,
            batchSize: 50,
            flushInterval: 5000,
            recordOptions: {
                slimDOMOptions: 'all',
                inlineStylesheet: true,
                inlineImages: false,
                collectFonts: true,
                recordCrossOriginIframes: false,
                maskAllInputs: true,
                maskTextSelector: '*'
            }
        });
    });

    test('RRWEB_CONFIG_DEV disables privacy masking', () => {
        expect(RRWEB_CONFIG_DEV).toEqual({
            ...RRWEB_CONFIG_PROD,
            recordOptions: {
                ...RRWEB_CONFIG_PROD.recordOptions,
                maskAllInputs: false,
                maskTextSelector: undefined,
                maskInputOptions: {}
            }
        });
    });

    test('merges custom config with defaults', () => {
        const p = new RRWebPlugin({ batchSize: 10 });
        expect(p['config'].batchSize).toEqual(10);
        expect(p['config'].additionalSampleRate).toEqual(
            RRWEB_CONFIG_PROD.additionalSampleRate
        );
        expect(p['config'].flushInterval).toEqual(
            RRWEB_CONFIG_PROD.flushInterval
        );
        expect(p['config'].recordOptions).toEqual(
            RRWEB_CONFIG_PROD.recordOptions
        );
    });

    test('enable starts rrweb recording', () => {
        plugin.load(context);
        plugin.enable();

        expect(mockRrwebRecord).toHaveBeenCalledTimes(1);
        expect(plugin.enabled).toBe(true);
    });

    test('enable does nothing if already enabled', () => {
        plugin.load(context);
        plugin.enable();
        plugin.enable();

        expect(mockRrwebRecord).toHaveBeenCalledTimes(1);
    });

    test('enable skips recording when session.record is false', () => {
        getSession.mockReturnValue({
            sessionId: 'abc123',
            record: false,
            eventCount: 0
        });
        plugin.load(context);
        plugin.enable();

        expect(mockRrwebRecord).not.toHaveBeenCalled();
        expect(plugin.enabled).toBe(false);
    });

    test('enable skips recording when no session', () => {
        getSession.mockReturnValue(null as any);
        plugin.load(context);
        plugin.enable();

        expect(mockRrwebRecord).not.toHaveBeenCalled();
        expect(plugin.enabled).toBe(false);
    });

    test('enable respects additionalSampleRate', () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.99);
        const p = new RRWebPlugin({ additionalSampleRate: 0.01 });
        p.load(context);
        p.enable();

        expect(mockRrwebRecord).not.toHaveBeenCalled();
        expect(p.enabled).toBe(false);
        jest.spyOn(Math, 'random').mockRestore();
    });

    test('disable stops recording and flushes remaining events', () => {
        plugin.load(context);
        plugin.enable();

        // Simulate an event via the emit callback
        const emitFn = mockRrwebRecord.mock.calls[0][0]!.emit!;
        emitFn(mockEvent() as any);

        plugin.disable();

        expect(plugin.enabled).toBe(false);
        // Remaining event should have been flushed
        expect(record).toHaveBeenCalledTimes(1);
    });

    test('disable does nothing if not enabled', () => {
        plugin.load(context);
        plugin.disable();

        expect(record).not.toHaveBeenCalled();
    });

    test('flushes events when batch size is reached', () => {
        const p = new RRWebPlugin({ batchSize: 2 });
        p.load(context);
        p.enable();

        const emitFn = mockRrwebRecord.mock.calls[0][0]!.emit!;
        const event1 = mockEvent(2, 1000);
        const event2 = mockEvent(3, 2000);
        emitFn(event1 as any);
        emitFn(event2 as any);

        expect(record).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(RRWEB_EVENT_TYPE);

        const payload = record.mock.calls[0][1] as SessionReplayEvent;
        expect(payload).toEqual({
            version: '1.0.0',
            events: [event1, event2],
            eventCount: 2
        });
    });

    test('flushes events on interval', () => {
        plugin.load(context);
        plugin.enable();

        const emitFn = mockRrwebRecord.mock.calls[0][0]!.emit!;
        emitFn(mockEvent() as any);

        expect(record).not.toHaveBeenCalled();

        jest.advanceTimersByTime(RRWEB_CONFIG_PROD.flushInterval);

        expect(record).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][1]).toMatchObject({
            version: '1.0.0',
            eventCount: 1
        });
    });

    test('does not flush when there are no events', () => {
        plugin.load(context);
        plugin.enable();

        jest.advanceTimersByTime(RRWEB_CONFIG_PROD.flushInterval);

        expect(record).not.toHaveBeenCalled();
    });

    test('events are cleared after flush', () => {
        const p = new RRWebPlugin({ batchSize: 2 });
        p.load(context);
        p.enable();

        const emitFn = mockRrwebRecord.mock.calls[0][0]!.emit!;
        emitFn(mockEvent() as any);
        emitFn(mockEvent() as any);

        // First flush
        expect(record).toHaveBeenCalledTimes(1);

        // Next interval should not flush (no new events)
        jest.advanceTimersByTime(RRWEB_CONFIG_PROD.flushInterval);
        expect(record).toHaveBeenCalledTimes(1);
    });

    test('ignores events after recording is stopped', () => {
        plugin.load(context);
        plugin.enable();

        const emitFn = mockRrwebRecord.mock.calls[0][0]!.emit!;
        plugin.disable();
        record.mockClear();

        emitFn(mockEvent() as any);

        jest.advanceTimersByTime(RRWEB_CONFIG_PROD.flushInterval);
        expect(record).not.toHaveBeenCalled();
    });

    test('record method with start action starts recording', () => {
        plugin.load(context);
        plugin.record({ action: 'start' });

        expect(mockRrwebRecord).toHaveBeenCalledTimes(1);
    });

    test('record method with stop action stops recording', () => {
        plugin.load(context);
        plugin.enable();

        const stopFn = mockRrwebRecord.mock.results[0].value;
        plugin.record({ action: 'stop' });

        expect(stopFn).toHaveBeenCalled();
    });
});
