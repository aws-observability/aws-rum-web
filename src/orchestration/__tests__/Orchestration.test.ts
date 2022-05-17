import { Orchestration } from '../Orchestration';
import { Dispatch } from '../../dispatch/Dispatch';
import { EventCache } from '../../event-cache/EventCache';
import { DomEventPlugin } from '../../plugins/event-plugins/DomEventPlugin';
import { JsErrorPlugin } from '../../plugins/event-plugins/JsErrorPlugin';
import { PluginManager } from '../../plugins/PluginManager';
import { PageIdFormatEnum } from '../Orchestration';

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
const recordPageView = jest.fn();

jest.mock('../../event-cache/EventCache', () => ({
    EventCache: jest.fn().mockImplementation(() => ({
        enable: enableEventCache,
        disable: disableEventCache,
        recordPageView: recordPageView
    }))
}));

const addPlugin = jest.fn();
const updatePlugin = jest.fn();

const enablePlugins = jest.fn();
const disablePlugins = jest.fn();

jest.mock('../../plugins/PluginManager', () => ({
    PluginManager: jest.fn().mockImplementation(() => ({
        addPlugin: addPlugin,
        enable: enablePlugins,
        disable: disablePlugins,
        updatePlugin: updatePlugin
    }))
}));

describe('Orchestration tests', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('when region is not provided then endpoint region defaults to us-west-2', async () => {
        // Init
        const orchestration = new Orchestration('a', 'c', undefined, {});

        // Assert
        expect(Dispatch).toHaveBeenCalledTimes(1);
        expect((Dispatch as any).mock.calls[0][1]).toEqual(
            new URL('https://dataplane.rum.us-west-2.amazonaws.com/')
        );
    });

    test('when region is provided then the endpoint uses that region', async () => {
        // Init
        const orchestration = new Orchestration('a', 'c', 'us-east-1', {});

        // Assert
        expect(Dispatch).toHaveBeenCalledTimes(1);
        expect((Dispatch as any).mock.calls[0][1]).toEqual(
            new URL('https://dataplane.rum.us-east-1.amazonaws.com/')
        );
    });

    test('when enable is true in config then orchestration enables dispatch, pluginManager and event cache', async () => {
        // Init
        const orchestration = new Orchestration('a', 'c', undefined, {});

        // Assert
        expect(enableDispatch).toHaveBeenCalledTimes(1);
        expect(enablePlugins).toHaveBeenCalledTimes(1);
        expect(enableEventCache).toHaveBeenCalledTimes(1);
    });

    test('when enable is false in config then orchestration disables dispatch, pluginManager and event cache', async () => {
        // Init
        const orchestration = new Orchestration('a', 'c', undefined, {
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
        const orchestration = new Orchestration('a', 'c', 'us-east-1', {
            eventPluginsToLoad: [new DomEventPlugin(), new JsErrorPlugin()],
            telemetries: collections
        });

        const expected = [
            'com.amazonaws.rum.dom-event',
            'com.amazonaws.rum.js-error',
            'com.amazonaws.rum.js-error',
            'com.amazonaws.rum.navigation',
            'com.amazonaws.rum.page-view',
            'com.amazonaws.rum.resource',
            'com.amazonaws.rum.web-vitals'
        ];
        const actual = [];

        // Assert
        expect(PluginManager).toHaveBeenCalledTimes(1);

        addPlugin.mock.calls.forEach((call) => {
            actual.push(call[0].pluginId);
        });

        expect(actual.sort()).toEqual(expected.sort());
    });

    test('when config is not provided then defaults are used', async () => {
        // Init
        const orchestration = new Orchestration(
            'a',
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
                unique: false,
                domain: window.location.hostname,
                path: '/',
                sameSite: 'Strict',
                secure: true
            },
            telemetries: [],
            disableAutoPageView: false,
            dispatchInterval: 5000,
            enableXRay: false,
            endpoint: 'https://dataplane.rum.us-west-2.amazonaws.com',
            endpointUrl: new URL(
                'https://dataplane.rum.us-west-2.amazonaws.com'
            ),
            eventCacheSize: 200,
            eventPluginsToLoad: [],
            pageIdFormat: PageIdFormatEnum.Path,
            pagesToExclude: [],
            pagesToInclude: [],
            recordResourceUrl: true,
            routeChangeComplete: 100,
            routeChangeTimeout: 10000,
            sessionEventLimit: 200,
            sessionLengthSeconds: 1800,
            sessionSampleRate: 1,
            userIdRetentionDays: 30,
            enableRumClient: true,
            fetchFunction: fetch
        });
    });

    test('when cookie attributes are provided then they are merged with defaults', async () => {
        // Init
        const orchestration = new Orchestration('a', undefined, undefined, {
            cookieAttributes: { path: '/console' }
        });

        // Assert
        expect(EventCache).toHaveBeenCalledTimes(1);
        expect((EventCache as any).mock.calls[0][1]).toEqual(
            expect.objectContaining({
                cookieAttributes: expect.objectContaining({ path: '/console' })
            })
        );
    });

    test('data collection defaults to only page views', async () => {
        // Init
        new Orchestration('a', 'c', 'us-east-1', {});
        const expected = ['com.amazonaws.rum.page-view'];
        const actual = [];

        // Assert
        expect(addPlugin).toHaveBeenCalledTimes(expected.length);

        addPlugin.mock.calls.forEach((call) => {
            actual.push(call[0].pluginId);
        });

        expect(actual.sort()).toEqual(expected.sort());
    });

    test('when http data collection is set then the http plugins are instantiated', async () => {
        // Init
        const orchestration = new Orchestration('a', 'c', 'us-east-1', {
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
            actual.push(call[0].pluginId);
        });

        expect(actual.sort()).toEqual(expected.sort());
    });

    test('when a config is passed to the http data collection then the config is added as a constructor arg', async () => {
        // Init
        new Orchestration('a', 'c', 'us-east-1', {
            telemetries: [['http', { trace: true }]]
        });

        // Assert
        addPlugin.mock.calls.forEach((call) => {
            const plugin: any = call[0];
            if (plugin.pluginId === 'com.amazonaws.rum.fetch') {
                expect(plugin.config.trace).toEqual(true);
            }
        });
    });

    test('when performance data collection is set then the performance plugins are instantiated', async () => {
        // Init
        const orchestration = new Orchestration('a', 'c', 'us-east-1', {
            telemetries: ['performance']
        });
        const expected = [
            'com.amazonaws.rum.navigation',
            'com.amazonaws.rum.resource',
            'com.amazonaws.rum.web-vitals',
            'com.amazonaws.rum.page-view'
        ];
        const actual = [];

        // Assert
        expect(addPlugin).toHaveBeenCalledTimes(expected.length);

        addPlugin.mock.calls.forEach((call) => {
            actual.push(call[0].pluginId);
        });

        expect(actual.sort()).toEqual(expected.sort());
    });

    test('when error data collection is set then the error plugins are instantiated', async () => {
        // Init
        const orchestration = new Orchestration('a', 'c', 'us-east-1', {
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
            actual.push(call[0].pluginId);
        });

        expect(actual.sort()).toEqual(expected.sort());
    });

    test('when interaction data collection is set then the interaction plugins are instantiated', async () => {
        // Init
        const orchestration = new Orchestration('a', 'c', 'us-east-1', {
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
            actual.push(call[0].pluginId);
        });

        expect(actual.sort()).toEqual(expected.sort());
    });

    test('the page view plugin is instantiated by default', async () => {
        // Init
        const orchestration = new Orchestration('a', 'c', 'us-east-1', {
            telemetries: []
        });
        const expected = ['com.amazonaws.rum.page-view'];
        const actual = [];

        // Assert
        expect(addPlugin).toHaveBeenCalledTimes(expected.length);

        addPlugin.mock.calls.forEach((call) => {
            actual.push(call[0].pluginId);
        });

        expect(actual.sort()).toEqual(expected.sort());
    });

    test('when disableAutoPageViews is true then the page view plugin is not installed', async () => {
        // Init
        const orchestration = new Orchestration('a', 'c', 'us-east-1', {
            disableAutoPageView: true,
            telemetries: []
        });
        const expected = [];
        const actual = [];

        // Assert
        expect(addPlugin).toHaveBeenCalledTimes(expected.length);

        addPlugin.mock.calls.forEach((call) => {
            actual.push(call[0].pluginId);
        });

        expect(actual.sort()).toEqual(expected.sort());
    });

    test('when the DOM event plugin is updated then provided target event is set to be the target DOM event', async () => {
        // Init
        const orchestration = new Orchestration('a', 'c', 'us-east-1', {
            eventPluginsToLoad: [
                new DomEventPlugin({
                    events: [{ event: 'click', elementId: 'button1' }]
                })
            ]
        });

        orchestration.registerDomEvents([
            { event: 'click', cssLocator: '[label="label1"]' }
        ]);

        const expected = { event: 'click', cssLocator: '[label="label1"]' };
        let actual;

        // Assert
        expect(updatePlugin).toHaveBeenCalledTimes(1);

        updatePlugin.mock.calls.forEach((call) => {
            actual = call[1][0];
        });

        expect(actual).toEqual(expected);
    });

    test('when the page is manually recorded with pageTag attribute then EventCache.recordPageView() is called', async () => {
        // Init
        const orchestration = new Orchestration('a', 'c', 'us-east-1', {});

        const expected = {
            pageId: '/rum/home',
            pageTags: ['pageGroup1']
        };
        orchestration.recordPageView(expected);

        let actual;

        // Assert
        expect(recordPageView).toHaveBeenCalledTimes(1);
        actual = recordPageView.mock.calls[0][0];

        expect(actual).toEqual(expected);
    });
});
