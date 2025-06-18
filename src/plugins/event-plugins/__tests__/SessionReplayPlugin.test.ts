import {
    SessionReplayPlugin,
    SESSION_REPLAY_EVENT_TYPE,
    eventWithTime,
    SessionReplayConfig
} from '../SessionReplayPlugin';
import { context } from '../../../test-utils/test-utils';
import * as rrweb from 'rrweb';

// Create a properly typed mock for record
const mockRecord = jest.fn();
// Replace the record function in the context with our mock
context.record = mockRecord;

// Mock rrweb
jest.mock('rrweb', () => ({
    record: jest.fn().mockReturnValue(jest.fn())
}));

// Type assertion helper for mocks
const asMock = (fn: any): jest.Mock => fn as unknown as jest.Mock;

describe('SessionReplayPlugin tests', () => {
    beforeEach(() => {
        mockRecord.mockClear();
        (rrweb.record as unknown as jest.Mock).mockClear();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('constructor initializes with default config', async () => {
        const plugin = new SessionReplayPlugin();
        expect(plugin).toBeDefined();
        expect(plugin.getPluginId()).toEqual(SESSION_REPLAY_EVENT_TYPE);
    });

    test('constructor initializes with custom config', async () => {
        const config: SessionReplayConfig = {
            batchSize: 100,
            recordConfig: {
                blockClass: 'private-data',
                maskAllInputs: true
            }
        };
        const plugin = new SessionReplayPlugin(config);
        expect(plugin).toBeDefined();
    });

    test('load initializes the plugin but does not start recording', async () => {
        const plugin = new SessionReplayPlugin();
        plugin.load(context);
        expect(rrweb.record).not.toHaveBeenCalled();
    });

    test('enable starts recording when session is available', async () => {
        // Setup
        const plugin = new SessionReplayPlugin();
        plugin.load(context);

        // Set session manually
        plugin['session'] = {
            sessionId: 'test-session-id',
            record: true,
            eventCount: 0
        };

        // Enable the plugin
        plugin.enable();

        // Verify recording started
        expect(asMock(rrweb.record)).toHaveBeenCalled();
    });

    test('disable stops recording', async () => {
        // Setup
        const plugin = new SessionReplayPlugin();
        plugin.load(context);

        // Set session manually
        plugin['session'] = {
            sessionId: 'test-session-id',
            record: true,
            eventCount: 0
        };

        // Enable and then disable
        plugin.enable();
        const mockRecorder = (rrweb.record as unknown as jest.Mock).mock
            .results[0].value;
        plugin.disable();

        // Verify recorder was called (to stop recording)
        expect(asMock(mockRecorder)).toHaveBeenCalled();
    });

    test('events are flushed when batch size is reached', async () => {
        // Setup
        const batchSize = 2;
        const plugin = new SessionReplayPlugin({ batchSize });
        plugin.load(context);

        // Set session manually
        plugin['session'] = {
            sessionId: 'test-session-id',
            record: true,
            eventCount: 0
        };

        // Enable the plugin
        plugin.enable();

        // Get the emit function that was passed to rrweb.record
        const emitFn = (rrweb.record as unknown as jest.Mock).mock.calls[0][0]
            .emit;

        // Simulate events being emitted
        const mockEvent1: eventWithTime = {
            type: 1,
            data: { source: 0 },
            timestamp: Date.now()
        };

        const mockEvent2: eventWithTime = {
            type: 2,
            data: { source: 1 },
            timestamp: Date.now()
        };

        // Emit events
        emitFn(mockEvent1);
        emitFn(mockEvent2);

        // Verify record was called with the events
        expect(mockRecord.mock.calls[0][0]).toEqual(SESSION_REPLAY_EVENT_TYPE);
        expect(mockRecord.mock.calls[0][1]).toMatchObject({
            events: [mockEvent1, mockEvent2],
            sessionId: 'test-session-id'
        });
    });

    test('forceFlush sends events immediately', async () => {
        // Setup
        const plugin = new SessionReplayPlugin();
        plugin.load(context);

        // Set session manually
        plugin['session'] = {
            sessionId: 'test-session-id',
            record: true,
            eventCount: 0
        };

        // Enable the plugin
        plugin.enable();

        // Get the emit function that was passed to rrweb.record
        const emitFn = (rrweb.record as unknown as jest.Mock).mock.calls[0][0]
            .emit;

        // Simulate an event being emitted (not enough to trigger automatic flush)
        const mockEvent: eventWithTime = {
            type: 1,
            data: { source: 0 },
            timestamp: Date.now()
        };

        emitFn(mockEvent);

        // Verify record was not called yet
        expect(asMock(mockRecord)).not.toHaveBeenCalled();

        // Force flush
        plugin.forceFlush();

        // Verify record was called with the event
        expect(mockRecord.mock.calls[0][0]).toEqual(SESSION_REPLAY_EVENT_TYPE);
        expect(mockRecord.mock.calls[0][1]).toMatchObject({
            events: [mockEvent],
            sessionId: 'test-session-id'
        });
    });

    test('custom record config is passed to rrweb', async () => {
        // Setup
        const recordConfig = {
            blockClass: 'private-data',
            maskAllInputs: true,
            maskTextClass: 'mask-text'
        };

        const plugin = new SessionReplayPlugin({
            recordConfig
        });

        plugin.load(context);

        // Set session manually
        plugin['session'] = {
            sessionId: 'test-session-id',
            record: true,
            eventCount: 0
        };

        // Enable the plugin
        plugin.enable();

        // Verify rrweb.record was called with the correct config
        expect(asMock(rrweb.record)).toHaveBeenCalledWith(
            expect.objectContaining({
                blockClass: recordConfig.blockClass,
                maskAllInputs: recordConfig.maskAllInputs,
                maskTextClass: recordConfig.maskTextClass,
                emit: expect.any(Function)
            })
        );
    });
});
