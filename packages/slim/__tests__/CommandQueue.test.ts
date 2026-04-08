import { CommandQueue, AwsRumClientInit } from '../src/CommandQueue';
import { performanceEvent } from '@aws-rum/web-core/test-utils/mock-data';

global.fetch = jest.fn();

const enable = jest.fn();
const disable = jest.fn();
const dispatch = jest.fn();
const dispatchBeacon = jest.fn();
const allowCookies = jest.fn();
const recordPageView = jest.fn();
const recordError = jest.fn();
const registerDomEvents = jest.fn();
const recordEvent = jest.fn();
const addSessionAttributes = jest.fn();
const setAwsCredentials = jest.fn();
const addPlugin = jest.fn();

jest.mock('../src/orchestration/Orchestration', () => ({
    Orchestration: jest.fn().mockImplementation(() => ({
        enable,
        disable,
        dispatch,
        dispatchBeacon,
        allowCookies,
        recordPageView,
        recordError,
        registerDomEvents,
        recordEvent,
        addSessionAttributes,
        setAwsCredentials,
        addPlugin
    }))
}));

const createAwsRumInit = (
    overrides: Partial<AwsRumClientInit> = {}
): AwsRumClientInit => ({
    q: [] as any,
    n: 'cwr',
    i: 'app-id',
    r: 'us-east-1',
    v: '1.0.0',
    ...overrides
});

describe('Slim CommandQueue tests', () => {
    beforeEach(() => {
        (window as any).performance = performanceEvent.performance();
        (window as any).PerformanceObserver =
            performanceEvent.PerformanceObserver;
        jest.clearAllMocks();
    });

    test('init creates Orchestration and overwrites global API', async () => {
        const cq = new CommandQueue();
        const init = createAwsRumInit();
        await cq.init(init);
        expect((window as any).cwr).toBeDefined();
    });

    test('signing is forced to false', async () => {
        const { Orchestration } = require('../src/orchestration/Orchestration');
        const cq = new CommandQueue();
        await cq.init(createAwsRumInit({ c: { signing: true } }));
        const config = Orchestration.mock.calls[0][3];
        expect(config.signing).toBe(false);
    });

    test('push dispatches recordPageView', async () => {
        const cq = new CommandQueue();
        await cq.init(createAwsRumInit());
        await cq.push({ c: 'recordPageView', p: '/test' });
        expect(recordPageView).toHaveBeenCalledWith('/test');
    });

    test('push dispatches enable', async () => {
        const cq = new CommandQueue();
        await cq.init(createAwsRumInit());
        await cq.push({ c: 'enable', p: undefined });
        expect(enable).toHaveBeenCalled();
    });

    test('push dispatches disable', async () => {
        const cq = new CommandQueue();
        await cq.init(createAwsRumInit());
        await cq.push({ c: 'disable', p: undefined });
        expect(disable).toHaveBeenCalled();
    });

    test('push dispatches dispatch', async () => {
        const cq = new CommandQueue();
        await cq.init(createAwsRumInit());
        await cq.push({ c: 'dispatch', p: undefined });
        expect(dispatch).toHaveBeenCalled();
    });

    test('push dispatches dispatchBeacon', async () => {
        const cq = new CommandQueue();
        await cq.init(createAwsRumInit());
        await cq.push({ c: 'dispatchBeacon', p: undefined });
        expect(dispatchBeacon).toHaveBeenCalled();
    });

    test('push dispatches setAwsCredentials', async () => {
        const cq = new CommandQueue();
        await cq.init(createAwsRumInit());
        const creds = { accessKeyId: 'a', secretAccessKey: 'b' };
        await cq.push({ c: 'setAwsCredentials', p: creds });
        expect(setAwsCredentials).toHaveBeenCalledWith(creds);
    });

    test('push dispatches addSessionAttributes', async () => {
        const cq = new CommandQueue();
        await cq.init(createAwsRumInit());
        await cq.push({ c: 'addSessionAttributes', p: { key: 'val' } });
        expect(addSessionAttributes).toHaveBeenCalledWith({ key: 'val' });
    });

    test('push throws for unknown command', async () => {
        const cq = new CommandQueue();
        await cq.init(createAwsRumInit());
        await expect(
            cq.push({ c: 'nonexistent', p: undefined })
        ).rejects.toThrow('UnsupportedOperationException');
    });

    test('allowCookies validates boolean input', async () => {
        const cq = new CommandQueue();
        await cq.init(createAwsRumInit());
        await cq.push({ c: 'allowCookies', p: true });
        expect(allowCookies).toHaveBeenCalledWith(true);
    });

    test('allowCookies throws for non-boolean', async () => {
        const cq = new CommandQueue();
        await cq.init(createAwsRumInit());
        await expect(cq.push({ c: 'allowCookies', p: 'yes' })).rejects.toThrow(
            'IncorrectParametersException'
        );
    });

    test('recordEvent validates payload shape', async () => {
        const cq = new CommandQueue();
        await cq.init(createAwsRumInit());
        await cq.push({
            c: 'recordEvent',
            p: { type: 'custom', data: { key: 1 } }
        });
        expect(recordEvent).toHaveBeenCalledWith('custom', { key: 1 });
    });

    test('recordEvent throws for invalid payload', async () => {
        const cq = new CommandQueue();
        await cq.init(createAwsRumInit());
        await expect(
            cq.push({ c: 'recordEvent', p: 'invalid' })
        ).rejects.toThrow('IncorrectParametersException');
    });

    test('queued commands are executed on init', async () => {
        const cq = new CommandQueue();
        const init = createAwsRumInit({
            q: [{ c: 'recordPageView', p: '/queued' }] as any
        });
        await cq.init(init);
        expect(recordPageView).toHaveBeenCalledWith('/queued');
    });
});
