import { Orchestration } from '../../src/orchestration/Orchestration';
import { Dispatch } from '@aws-rum/web-core/dispatch/Dispatch';
import { EventCache } from '@aws-rum/web-core/event-cache/EventCache';
import { PluginManager } from '@aws-rum/web-core/plugins/PluginManager';
import { performanceEvent } from '@aws-rum/web-core/test-utils/mock-data';

global.fetch = jest.fn();

const enableDispatch = jest.fn();
const disableDispatch = jest.fn();
const setAwsCredentials = jest.fn();
const setSigningConfigFactory = jest.fn();

jest.mock('@aws-rum/web-core/dispatch/Dispatch', () => ({
    Dispatch: jest.fn().mockImplementation(() => ({
        enable: enableDispatch,
        disable: disableDispatch,
        setAwsCredentials,
        setSigningConfigFactory
    }))
}));

const enableEventCache = jest.fn();
const disableEventCache = jest.fn();
const recordPageView = jest.fn();
const addSessionAttributes = jest.fn();
const recordEvent = jest.fn();
jest.mock('@aws-rum/web-core/event-cache/EventCache', () => ({
    EventCache: jest.fn().mockImplementation(() => ({
        enable: enableEventCache,
        disable: disableEventCache,
        recordPageView,
        addSessionAttributes,
        recordEvent,
        setPluginFlushHook: jest.fn()
    }))
}));

const addPlugin = jest.fn();
const updatePlugin = jest.fn();
const enablePlugins = jest.fn();
const disablePlugins = jest.fn();
const pluginRecord = jest.fn();
jest.mock('@aws-rum/web-core/plugins/PluginManager', () => ({
    PluginManager: jest.fn().mockImplementation(() => ({
        addPlugin,
        enable: enablePlugins,
        disable: disablePlugins,
        updatePlugin,
        record: pluginRecord,
        flush: jest.fn()
    }))
}));

describe('Slim Orchestration tests', () => {
    beforeEach(() => {
        (window as any).performance = performanceEvent.performance();
        (window as any).PerformanceObserver =
            performanceEvent.PerformanceObserver;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('when region is not provided then endpoint defaults to us-west-2', async () => {
        new Orchestration('a', 'c', undefined, {});
        expect((Dispatch as any).mock.calls[0][2]).toEqual(
            new URL('https://dataplane.rum.us-west-2.amazonaws.com')
        );
    });

    test('when region is provided then endpoint uses that region', async () => {
        new Orchestration('a', 'c', 'eu-west-1', {});
        expect((Dispatch as any).mock.calls[0][2]).toEqual(
            new URL('https://dataplane.rum.eu-west-1.amazonaws.com')
        );
    });

    test('when custom endpoint is provided then it overrides default', async () => {
        new Orchestration('a', 'c', 'us-east-1', {
            endpoint: 'https://custom.endpoint.com'
        });
        expect((Dispatch as any).mock.calls[0][2]).toEqual(
            new URL('https://custom.endpoint.com')
        );
    });

    test('when enableRumClient is true then all components are enabled', async () => {
        new Orchestration('a', 'c', 'us-east-1', { enableRumClient: true });
        expect(enableDispatch).toHaveBeenCalledTimes(1);
        expect(enablePlugins).toHaveBeenCalledTimes(1);
        expect(enableEventCache).toHaveBeenCalledTimes(1);
    });

    test('when enableRumClient is false then all components are disabled', async () => {
        new Orchestration('a', 'c', 'us-east-1', { enableRumClient: false });
        expect(disableDispatch).toHaveBeenCalledTimes(1);
        expect(disablePlugins).toHaveBeenCalledTimes(1);
        expect(disableEventCache).toHaveBeenCalledTimes(1);
    });

    test('only PageViewPlugin loads by default', async () => {
        new Orchestration('a', 'c', 'us-east-1', {});
        const actual = addPlugin.mock.calls.map((call: any) =>
            call[0].getPluginId()
        );
        expect(actual).toEqual(['com.amazonaws.rum.page-view']);
    });

    test('when disableAutoPageView is true then no plugins load', async () => {
        new Orchestration('a', 'c', 'us-east-1', {
            disableAutoPageView: true
        });
        expect(addPlugin).not.toHaveBeenCalled();
    });

    test('eventPluginsToLoad adds custom plugins', async () => {
        const mockPlugin = {
            getPluginId: () => 'custom-plugin',
            load: jest.fn(),
            enable: jest.fn(),
            disable: jest.fn(),
            record: jest.fn()
        };
        new Orchestration('a', 'c', 'us-east-1', {
            eventPluginsToLoad: [mockPlugin as any]
        });
        const ids = addPlugin.mock.calls.map((call: any) =>
            call[0].getPluginId()
        );
        expect(ids).toContain('com.amazonaws.rum.page-view');
        expect(ids).toContain('custom-plugin');
    });

    test('signing defaults to false', async () => {
        new Orchestration('a', 'c', 'us-east-1', {});
        const config = (Dispatch as any).mock.calls[0][4];
        expect(config.signing).toBe(false);
    });

    test('enable delegates to all components', async () => {
        const orch = new Orchestration('a', 'c', 'us-east-1', {
            enableRumClient: false
        });
        jest.clearAllMocks();
        orch.enable();
        expect(enableEventCache).toHaveBeenCalledTimes(1);
        expect(enablePlugins).toHaveBeenCalledTimes(1);
        expect(enableDispatch).toHaveBeenCalledTimes(1);
    });

    test('disable delegates to all components', async () => {
        const orch = new Orchestration('a', 'c', 'us-east-1', {});
        jest.clearAllMocks();
        orch.disable();
        expect(disableDispatch).toHaveBeenCalledTimes(1);
        expect(disablePlugins).toHaveBeenCalledTimes(1);
        expect(disableEventCache).toHaveBeenCalledTimes(1);
    });

    test('setAwsCredentials delegates to dispatch', async () => {
        const orch = new Orchestration('a', 'c', 'us-east-1', {});
        const creds = { accessKeyId: 'a', secretAccessKey: 'b' };
        orch.setAwsCredentials(creds as any);
        expect(setAwsCredentials).toHaveBeenCalledWith(creds);
    });

    test('setSigningConfigFactory delegates to dispatch', async () => {
        const orch = new Orchestration('a', 'c', 'us-east-1', {});
        const factory = jest.fn();
        orch.setSigningConfigFactory(factory);
        expect(setSigningConfigFactory).toHaveBeenCalledWith(factory);
    });

    test('addSessionAttributes delegates to eventCache', async () => {
        const orch = new Orchestration('a', 'c', 'us-east-1', {});
        orch.addSessionAttributes({ key: 'value' });
        expect(addSessionAttributes).toHaveBeenCalledWith({ key: 'value' });
    });

    test('recordPageView delegates to eventCache', async () => {
        const orch = new Orchestration('a', 'c', 'us-east-1', {});
        orch.recordPageView('/test');
        expect(recordPageView).toHaveBeenCalledWith('/test');
    });

    test('recordError delegates to pluginManager', async () => {
        const orch = new Orchestration('a', 'c', 'us-east-1', {});
        const error = new Error('test');
        orch.recordError(error);
        expect(pluginRecord).toHaveBeenCalledWith(
            'com.amazonaws.rum.js-error',
            error
        );
    });

    test('registerDomEvents delegates to pluginManager', async () => {
        const orch = new Orchestration('a', 'c', 'us-east-1', {});
        const events = [{ event: 'click', cssLocator: '#btn' }];
        orch.registerDomEvents(events);
        expect(updatePlugin).toHaveBeenCalledWith(
            'com.amazonaws.rum.dom-event',
            events
        );
    });

    test('recordEvent delegates to eventCache', async () => {
        const orch = new Orchestration('a', 'c', 'us-east-1', {});
        orch.recordEvent('custom.event', { data: 1 });
        expect(recordEvent).toHaveBeenCalledWith('custom.event', { data: 1 });
    });
});
