import {
    SessionReplayPlugin,
    SESSION_REPLAY_EVENT_TYPE,
    eventWithTime,
    SessionReplayConfig
} from '../SessionReplayPlugin';
import { context } from '../../../test-utils/test-utils';
import {
    RUM_SESSION_START,
    RUM_SESSION_EXPIRE
} from '../../../sessions/SessionManager';
import { Topic } from '../../../event-bus/EventBus';
import * as rrweb from 'rrweb';

// Create a properly typed mock for record
const mockRecord = jest.fn();
// Replace the record function in the context with our mock
context.record = mockRecord;

// Mock rrweb
jest.mock('rrweb', () => ({
    record: jest.fn().mockReturnValue(jest.fn())
}));

// Mock fetch for S3 upload tests
const mockFetch = jest.fn().mockImplementation(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
    })
);
global.fetch = mockFetch as any;

describe('SessionReplayPlugin tests', () => {
    beforeEach(() => {
        mockRecord.mockClear();
        (rrweb.record as unknown as jest.Mock).mockClear();
        mockFetch.mockClear();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('constructor initializes with default config', async () => {
        const plugin = new SessionReplayPlugin();
        expect(plugin).toBeDefined();
        expect(plugin.getPluginId()).toEqual('aws:rum.rrweb');
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

        // Simulate session start event
        context.eventBus.dispatch(RUM_SESSION_START as unknown as Topic, {
            sessionId: 'test-session-id'
        });

        // Enable the plugin
        plugin.enable();

        // Verify recording started
        expect(rrweb.record).toHaveBeenCalled();
    });

    test('disable stops recording', async () => {
        // Setup
        const plugin = new SessionReplayPlugin();
        plugin.load(context);

        // Simulate session start event
        context.eventBus.dispatch(RUM_SESSION_START as unknown as Topic, {
            sessionId: 'test-session-id'
        });

        // Enable and then disable
        plugin.enable();
        const mockRecorder = (rrweb.record as unknown as jest.Mock).mock
            .results[0].value;
        plugin.disable();

        // Verify recorder was called (to stop recording)
        expect(mockRecorder).toHaveBeenCalled();
    });

    test('events are flushed when batch size is reached', async () => {
        // Setup
        const batchSize = 2;
        const plugin = new SessionReplayPlugin({ batchSize });
        plugin.load(context);

        // Simulate session start event
        context.eventBus.dispatch(RUM_SESSION_START as unknown as Topic, {
            sessionId: 'test-session-id'
        });

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

        // Simulate session start event
        context.eventBus.dispatch(RUM_SESSION_START as unknown as Topic, {
            sessionId: 'test-session-id'
        });

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
        expect(mockRecord).not.toHaveBeenCalled();

        // Force flush
        plugin.forceFlush();

        // Verify record was called with the event
        expect(mockRecord.mock.calls[0][0]).toEqual(SESSION_REPLAY_EVENT_TYPE);
        expect(mockRecord.mock.calls[0][1]).toMatchObject({
            events: [mockEvent],
            sessionId: 'test-session-id'
        });
    });

    test('events are sent to S3 when S3 config is provided', async () => {
        // Setup
        const s3Config = {
            endpoint: 'https://api.example.com/upload',
            bucketName: 'test-bucket',
            region: 'us-west-2',
            additionalMetadata: {
                appVersion: '1.0.0'
            }
        };

        const plugin = new SessionReplayPlugin({
            s3Config
        });

        plugin.load(context);

        // Simulate session start event
        context.eventBus.dispatch(RUM_SESSION_START as unknown as Topic, {
            sessionId: 'test-session-id'
        });

        // Enable the plugin
        plugin.enable();

        // Get the emit function that was passed to rrweb.record
        const emitFn = (rrweb.record as unknown as jest.Mock).mock.calls[0][0]
            .emit;

        // Simulate an event being emitted
        const mockEvent: eventWithTime = {
            type: 1,
            data: { source: 0 },
            timestamp: Date.now()
        };

        emitFn(mockEvent);

        // Force flush to send to S3
        plugin.forceFlush();

        // Wait for async operations
        await new Promise((resolve) => setTimeout(resolve, 0));

        // Verify fetch was called with the correct endpoint
        expect(mockFetch).toHaveBeenCalledWith(
            s3Config.endpoint,
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    'Content-Type': 'application/json'
                })
            })
        );

        // Verify the payload structure
        const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(payload).toMatchObject({
            bucketName: s3Config.bucketName,
            region: s3Config.region,
            data: {
                sessionId: 'test-session-id',
                events: [mockEvent],
                metadata: expect.objectContaining({
                    sessionId: 'test-session-id',
                    appVersion: '1.0.0',
                    forced: true
                })
            }
        });
    });

    test('S3 upload handles errors gracefully', async () => {
        // Setup - mock fetch to reject
        mockFetch.mockImplementationOnce(() =>
            Promise.resolve({
                ok: false,
                statusText: 'Internal Server Error'
            })
        );

        const s3Config = {
            endpoint: 'https://api.example.com/upload',
            bucketName: 'test-bucket'
        };

        const plugin = new SessionReplayPlugin({
            s3Config
        });

        plugin.load(context);

        // Simulate session start event
        context.eventBus.dispatch(RUM_SESSION_START as unknown as Topic, {
            sessionId: 'test-session-id'
        });

        // Enable the plugin
        plugin.enable();

        // Get the emit function that was passed to rrweb.record
        const emitFn = (rrweb.record as unknown as jest.Mock).mock.calls[0][0]
            .emit;

        // Simulate an event being emitted
        const mockEvent: eventWithTime = {
            type: 1,
            data: { source: 0 },
            timestamp: Date.now()
        };

        emitFn(mockEvent);

        // Spy on console.error
        const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation();

        // Force flush to attempt S3 upload
        plugin.forceFlush();

        // Wait for async operations
        await new Promise((resolve) => setTimeout(resolve, 0));

        // Verify fetch was called
        expect(mockFetch).toHaveBeenCalled();

        // Verify events are retried on next flush
        mockFetch.mockImplementationOnce(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({})
            })
        );

        // Force flush again
        plugin.forceFlush();

        // Wait for async operations
        await new Promise((resolve) => setTimeout(resolve, 0));

        // Verify fetch was called again
        expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    test('session expiration stops recording', async () => {
        // Setup
        const plugin = new SessionReplayPlugin();
        plugin.load(context);

        // Simulate session start event
        context.eventBus.dispatch(RUM_SESSION_START as unknown as Topic, {
            sessionId: 'test-session-id'
        });

        // Enable the plugin
        plugin.enable();

        // Verify recording started
        expect(rrweb.record).toHaveBeenCalled();

        // Simulate session expiration
        context.eventBus.dispatch(RUM_SESSION_EXPIRE as unknown as Topic, {});

        // Get the recorder function
        const mockRecorder = (rrweb.record as unknown as jest.Mock).mock
            .results[0].value;

        // Verify recorder was called (to stop recording)
        expect(mockRecorder).toHaveBeenCalled();
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

        // Simulate session start event
        context.eventBus.dispatch(RUM_SESSION_START as unknown as Topic, {
            sessionId: 'test-session-id'
        });

        // Enable the plugin
        plugin.enable();

        // Verify rrweb.record was called with the correct config
        expect(rrweb.record).toHaveBeenCalledWith(
            expect.objectContaining({
                blockClass: recordConfig.blockClass,
                maskAllInputs: recordConfig.maskAllInputs,
                maskTextClass: recordConfig.maskTextClass,
                emit: expect.any(Function)
            })
        );
    });

    test('recorder handles errors gracefully', async () => {
        // Setup - mock rrweb.record to throw an error
        (rrweb.record as unknown as jest.Mock).mockImplementationOnce(() => {
            throw new Error('Recording error');
        });

        // Spy on console.error
        const consoleErrorSpy = jest
            .spyOn(console, 'error')
            .mockImplementation();

        const plugin = new SessionReplayPlugin();
        plugin.load(context);

        // Simulate session start event
        context.eventBus.dispatch(RUM_SESSION_START as unknown as Topic, {
            sessionId: 'test-session-id'
        });

        // Enable the plugin - should not throw
        expect(() => plugin.enable()).not.toThrow();

        // Verify error was logged
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            '[RRWebPlugin] Error setting up recorder:',
            expect.any(Error)
        );
    });
});
