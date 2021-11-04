import { TELEMETRY_TYPES, Orchestration } from '../Orchestration';
import { Dispatch } from '../../dispatch/Dispatch';
import { EventCache } from '../../event-cache/EventCache';
import { DomEventPlugin } from '../../plugins/event-plugins/DomEventPlugin';
import { JsErrorPlugin } from '../../plugins/event-plugins/JsErrorPlugin';
import { PluginManager } from '../../plugins/PluginManager';

global.fetch = jest.fn();

const enableDispatch = jest.fn();
const disableDispatch = jest.fn();

jest.mock('../../dispatch/Dispatch', () => ({
    Dispatch: jest.fn().mockImplementation(() => ({
        enable: enableDispatch,
        disable: disableDispatch
    }))
}));

const enableEventCache = jest.fn();
const disableEventCache = jest.fn();

jest.mock('../../event-cache/EventCache', () => ({
    EventCache: jest.fn().mockImplementation(() => ({
        enable: enableEventCache,
        disable: disableEventCache
    }))
}));

const addPlugin = jest.fn();

const configurePluginSpy = jest.fn((p, q) => {
    /*do nothing*/
});

const enablePlugins = jest.fn();
const disablePlugins = jest.fn();

jest.mock('../../plugins/PluginManager', () => ({
    PluginManager: jest.fn().mockImplementation(() => ({
        addPlugin: addPlugin,
        configurePlugin: configurePluginSpy,
        enable: enablePlugins,
        disable: disablePlugins
    }))
}));

describe('Orchestration tests', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('when region is not provided then endpoint region defaults to us-west-2', async () => {
        // Init
        const orchestration = new Orchestration('a', 'b', 'c', undefined, {});

        // Assert
        expect(Dispatch).toHaveBeenCalledTimes(1);
        expect((Dispatch as any).mock.calls[0][2]).toEqual(
            'https://dataplane.us-west-2.gamma.rum.aws.dev'
        );
    });

    test('when region is provided then the endpoint uses that region', async () => {
        // Init
        const orchestration = new Orchestration('a', 'b', 'c', 'us-east-1', {});

        // Assert
        expect(Dispatch).toHaveBeenCalledTimes(1);
        expect((Dispatch as any).mock.calls[0][2]).toEqual(
            'https://dataplane.us-east-1.gamma.rum.aws.dev'
        );
    });

    test('when enable is true in config then orchestration enables dispatch, pluginManager and event cache', async () => {
        // Init
        const orchestration = new Orchestration('a', 'b', 'c', undefined, {});

        // Assert
        expect(enableDispatch).toHaveBeenCalledTimes(1);
        expect(enablePlugins).toHaveBeenCalledTimes(1);
        expect(enableEventCache).toHaveBeenCalledTimes(1);
    });

    test('when enable is false in config then orchestration disables dispatch, pluginManager and event cache', async () => {
        // Init
        const orchestration = new Orchestration('a', 'b', 'c', undefined, {
            enableRumClient: false
        });

        // Assert
        expect(disableDispatch).toHaveBeenCalledTimes(1);
        expect(disablePlugins).toHaveBeenCalledTimes(1);
        expect(disableEventCache).toHaveBeenCalledTimes(1);
    });

    test('when eventPluginsToLoad is provided in config then it is added with default plugins', async () => {
        // Init
        const collections = ['errors', 'performance'];
        const orchestration = new Orchestration('a', 'b', 'c', 'us-east-1', {
            eventPluginsToLoad: [new DomEventPlugin(), new JsErrorPlugin()],
            telemetries: collections
        });

        const expected = [
            'com.amazonaws.rum.dom-event',
            'com.amazonaws.rum.js-error',
            'com.amazonaws.rum.js-error',
            'com.amazonaws.rum.navigation',
            'com.amazonaws.rum.page-view',
            'com.amazonaws.rum.paint',
            'com.amazonaws.rum.resource',
            'com.amazonaws.rum.web-vitals'
        ];
        const actual = [];

        // Assert
        expect(PluginManager).toHaveBeenCalledTimes(1);

        addPlugin.mock.calls.forEach((call) => {
            actual.push(call[0].getPluginId());
        });

        expect(actual.sort()).toEqual(expected.sort());
    });

    test('when config is not provided then defaults are used', async () => {
        // Init
        const orchestration = new Orchestration(
            'a',
            undefined,
            undefined,
            undefined,
            undefined
        );

        // Assert
        expect(EventCache).toHaveBeenCalledTimes(1);
        expect((EventCache as any).mock.calls[0][1]).toEqual({
            allowCookies: false,
            batchLimit: 100,
            cookieAttributes: {
                domain: window.location.hostname,
                path: '/',
                sameSite: 'Strict',
                secure: true
            },
            telemetries: ['errors', 'performance', 'interaction'],
            disableAutoPageView: false,
            dispatchInterval: 5000,
            endpoint: 'https://dataplane.us-west-2.gamma.rum.aws.dev',
            eventCacheSize: 200,
            eventPluginsToLoad: [],
            pageIdFormat: 'PATH',
            pagesToExclude: [],
            pagesToInclude: [],
            sessionEventLimit: 200,
            sessionLengthSeconds: 1800,
            sessionSampleRate: 1,
            userIdRetentionDays: 0,
            enableRumClient: true,
            fetchFunction: fetch
        });
    });

    test('when cookie attributes are provided then they are merged with defaults', async () => {
        // Init
        const orchestration = new Orchestration(
            'a',
            undefined,
            undefined,
            undefined,
            { cookieAttributes: { path: '/console' } }
        );

        // Assert
        expect(EventCache).toHaveBeenCalledTimes(1);
        expect((EventCache as any).mock.calls[0][1]).toEqual(
            expect.objectContaining({
                cookieAttributes: expect.objectContaining({ path: '/console' })
            })
        );
    });

    test('data collection defaults to errors, performance, journey and interaction', async () => {
        // Init
        const orchestration = new Orchestration('a', 'b', 'c', 'us-east-1', {});
        const expected = [
            'com.amazonaws.rum.js-error',
            'com.amazonaws.rum.navigation',
            'com.amazonaws.rum.paint',
            'com.amazonaws.rum.resource',
            'com.amazonaws.rum.web-vitals',
            'com.amazonaws.rum.dom-event',
            'com.amazonaws.rum.page-view'
        ];
        const actual = [];

        // Assert
        expect(addPlugin).toHaveBeenCalledTimes(expected.length);

        addPlugin.mock.calls.forEach((call) => {
            actual.push(call[0].getPluginId());
        });

        expect(actual.sort()).toEqual(expected.sort());
    });

    test('when http data collection is set then the http plugins are instantiated', async () => {
        // Init
        const orchestration = new Orchestration('a', 'b', 'c', 'us-east-1', {
            telemetries: ['http']
        });
        const expected = [
            'com.amazonaws.rum.xhr',
            'com.amazonaws.rum.fetch',
            'com.amazonaws.rum.page-view'
        ];
        const actual = [];

        // Assert
        expect(addPlugin).toHaveBeenCalledTimes(expected.length);

        addPlugin.mock.calls.forEach((call) => {
            actual.push(call[0].getPluginId());
        });

        expect(actual.sort()).toEqual(expected.sort());
    });

    test('when performance data collection is set then the performance plugins are instantiated', async () => {
        // Init
        const orchestration = new Orchestration('a', 'b', 'c', 'us-east-1', {
            telemetries: ['performance']
        });
        const expected = [
            'com.amazonaws.rum.navigation',
            'com.amazonaws.rum.paint',
            'com.amazonaws.rum.resource',
            'com.amazonaws.rum.web-vitals',
            'com.amazonaws.rum.page-view'
        ];
        const actual = [];

        // Assert
        expect(addPlugin).toHaveBeenCalledTimes(expected.length);

        addPlugin.mock.calls.forEach((call) => {
            actual.push(call[0].getPluginId());
        });

        expect(actual.sort()).toEqual(expected.sort());
    });

    test('when error data collection is set then the error plugins are instantiated', async () => {
        // Init
        const orchestration = new Orchestration('a', 'b', 'c', 'us-east-1', {
            telemetries: ['errors']
        });
        const expected = [
            'com.amazonaws.rum.js-error',
            'com.amazonaws.rum.page-view'
        ];
        const actual = [];

        // Assert
        expect(addPlugin).toHaveBeenCalledTimes(expected.length);

        addPlugin.mock.calls.forEach((call) => {
            actual.push(call[0].getPluginId());
        });

        expect(actual.sort()).toEqual(expected.sort());
    });

    test('when interaction data collection is set then the interaction plugins are instantiated', async () => {
        // Init
        const orchestration = new Orchestration('a', 'b', 'c', 'us-east-1', {
            telemetries: ['interaction']
        });
        const expected = [
            'com.amazonaws.rum.dom-event',
            'com.amazonaws.rum.page-view'
        ];
        const actual = [];

        // Assert
        expect(addPlugin).toHaveBeenCalledTimes(expected.length);

        addPlugin.mock.calls.forEach((call) => {
            actual.push(call[0].getPluginId());
        });

        expect(actual.sort()).toEqual(expected.sort());
    });

    test('the page view plugin is instantiated by default', async () => {
        // Init
        const orchestration = new Orchestration('a', 'b', 'c', 'us-east-1', {
            telemetries: []
        });
        const expected = ['com.amazonaws.rum.page-view'];
        const actual = [];

        // Assert
        expect(addPlugin).toHaveBeenCalledTimes(expected.length);

        addPlugin.mock.calls.forEach((call) => {
            actual.push(call[0].getPluginId());
        });

        expect(actual.sort()).toEqual(expected.sort());
    });

    test('when disableAutoPageViews is true then the page view plugin is not installed', async () => {
        // Init
        const orchestration = new Orchestration('a', 'b', 'c', 'us-east-1', {
            disableAutoPageView: true,
            telemetries: []
        });
        const expected = [];
        const actual = [];

        // Assert
        expect(addPlugin).toHaveBeenCalledTimes(expected.length);

        addPlugin.mock.calls.forEach((call) => {
            actual.push(call[0].getPluginId());
        });

        expect(actual.sort()).toEqual(expected.sort());
    });
});
