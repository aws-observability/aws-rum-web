import { Orchestration } from '../Orchestration';
import { Dispatch } from '../../dispatch/Dispatch';
import { EventCache } from '../../event-cache/EventCache';
import { DomEventPlugin } from '../../plugins/event-plugins/DomEventPlugin';
import { JsErrorPlugin } from '../../plugins/event-plugins/JsErrorPlugin';
import { PluginManager } from '../../plugins/PluginManager';
import { PageIdFormatEnum } from '../Orchestration';
import { PageAttributes } from '../../sessions/PageManager';
import { INSTALL_MODULE, INSTALL_SCRIPT } from '../../utils/constants';
import { performanceEvent } from '../../test-utils/mock-data';

global.fetch = jest.fn();

const enableDispatch = jest.fn();
const disableDispatch = jest.fn();
const setAwsCredentials = jest.fn();

jest.mock('../../dispatch/Dispatch', () => ({
    Dispatch: jest.fn().mockImplementation(() => ({
        enable: enableDispatch,
        disable: disableDispatch,
        setAwsCredentials
    }))
}));

jest.mock('../../utils/common-utils', () => {
    const originalModule = jest.requireActual('../../utils/common-utils');
    return {
        __esModule: true,
        ...originalModule,
        isLCPSupported: jest.fn().mockReturnValue(true)
    };
});

const enableEventCache = jest.fn();
const disableEventCache = jest.fn();
const recordPageView = jest.fn();
const addSessionAttributes = jest.fn();
const recordEvent = jest.fn();

let samplingDecision = true;
const isSessionSampled = jest.fn().mockImplementation(() => samplingDecision);
jest.mock('../../event-cache/EventCache', () => ({
    EventCache: jest.fn().mockImplementation(() => ({
        enable: enableEventCache,
        disable: disableEventCache,
        recordPageView,
        addSessionAttributes,
        recordEvent,
        isSessionSampled
    }))
}));

const addPlugin = jest.fn();
const updatePlugin = jest.fn();

const enablePlugins = jest.fn();
const disablePlugins = jest.fn();

jest.mock('../../plugins/PluginManager', () => ({
    PluginManager: jest.fn().mockImplementation(() => ({
        addPlugin,
        enable: enablePlugins,
        disable: disablePlugins,
        updatePlugin
    }))
}));

describe('Orchestration tests', () => {
    beforeEach(() => {
        (window as any).performance = performanceEvent.performance();
        (window as any).PerformanceObserver =
            performanceEvent.PerformanceObserver;
    });

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
            undefined
        );

        // Assert
        expect(EventCache).toHaveBeenCalledTimes(1);
        expect((EventCache as any).mock.calls[0][1]).toEqual({
            allowCookies: false,
            batchLimit: 100,
            client: INSTALL_MODULE,
            cookieAttributes: {
                unique: false,
                domain: window.location.hostname,
                path: '/',
                sameSite: 'Strict',
                secure: true
            },
            sessionAttributes: {},
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
            pagesToInclude: [/.*/],
            signing: true,
            recordResourceUrl: true,
            retries: 2,
            routeChangeComplete: 100,
            routeChangeTimeout: 10000,
            sessionEventLimit: 200,
            sessionLengthSeconds: 1800,
            sessionSampleRate: 1,
            userIdRetentionDays: 30,
            enableRumClient: true,
            useBeacon: true,
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
        const orchestration = new Orchestration('a', 'c', 'us-east-1', {});
        const expected = ['com.amazonaws.rum.page-view'];
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
            actual.push(call[0].getPluginId());
        });

        expect(actual.sort()).toEqual(expected.sort());
    });

    test('when a config is passed to the http data collection then the config is added as a constructor arg', async () => {
        // Init
        const orchestration = new Orchestration('a', 'c', 'us-east-1', {
            telemetries: [['http', { trace: true }]]
        });

        // Assert
        addPlugin.mock.calls.forEach((call) => {
            const plugin: any = call[0];
            if (plugin.getPluginId() === 'com.amazonaws.rum.fetch') {
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
            actual.push(call[0].getPluginId());
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
            actual.push(call[0].getPluginId());
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
            actual.push(call[0].getPluginId());
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
            actual.push(call[0].getPluginId());
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
            actual.push(call[0].getPluginId());
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

        // Assert
        expect(recordPageView).toHaveBeenCalledTimes(1);
        const actual = recordPageView.mock.calls[0][0];

        expect(actual).toEqual(expected);
    });

    test('when the page is manually recorded with multiple custom page attributes then EventCache.recordPageView() is called', async () => {
        // Init
        const orchestration = new Orchestration('a', 'c', 'us-east-1', {});

        const expected: PageAttributes = {
            pageId: '/rum/home',
            pageTags: ['pageGroup1'],
            pageAttributes: {
                customPageAttributeString: 'customPageAttributeValue',
                customPageAttributeNumber: 1,
                customPageAttributeBoolean: true
            }
        };
        orchestration.recordPageView(expected);

        // Assert
        expect(recordPageView).toHaveBeenCalledTimes(1);
        const actual = recordPageView.mock.calls[0][0];

        expect(actual).toEqual(expected);
    });

    test('when Orchestration.addSessionAttributes is called then EventCache.addSessionAttributes() is called', async () => {
        // Init
        const orchestration = new Orchestration('a', 'c', 'us-east-1', {});

        const expected = {
            customAttributeString: 'customAttributeValue',
            customAttributeNumber: 1,
            customAttributeBoolean: true
        };
        orchestration.addSessionAttributes(expected);

        // Assert
        expect(addSessionAttributes).toHaveBeenCalledTimes(1);
        const actual = addSessionAttributes.mock.calls[0][0];

        expect(actual).toEqual(expected);
    });

    test('when custom session attributes are initialized at setup then EventCache.addSessionAttributes() is called', async () => {
        // Init
        const orchestration = new Orchestration('a', 'c', 'us-east-1', {
            sessionAttributes: {
                customAttributeString: 'customAttributeValue',
                customAttributeNumber: 1,
                customAttributeBoolean: true
            }
        });

        const expected = {
            customAttributeString: 'customAttributeValue',
            customAttributeNumber: 1,
            customAttributeBoolean: true
        };
        orchestration.addSessionAttributes(expected);

        // Assert
        expect(addSessionAttributes).toHaveBeenCalledTimes(1);
        const actual = addSessionAttributes.mock.calls[0][0];

        expect(actual).toEqual(expected);
    });

    test('when recordEvent receives valid input then event is recorded', async () => {
        // Init
        const orchestration = new Orchestration('a', 'c', 'us-east-1', {});
        const expected = {
            int_field: 100,
            string_field: 'string',
            nested_field: { int_subfield: 100 }
        };

        orchestration.recordEvent('custom_event', expected);
        expect(recordEvent).toHaveBeenCalledTimes(1);
        const actual = recordEvent.mock.calls[0][1];
        expect(actual).toEqual(expected);
    });

    test('when recordEvent has empty eventData then event is recorded', async () => {
        // Init
        const orchestration = new Orchestration('a', 'c', 'us-east-1', {});
        const expected = {};

        orchestration.recordEvent('custom_event', {});
        expect(recordEvent).toHaveBeenCalledTimes(1);
        const actual = recordEvent.mock.calls[0][1];
        expect(actual).toEqual(expected);
    });

    test('when initialized from CommandQueue then set client to installed by script', async () => {
        // Init
        const orchestration = new Orchestration('a', 'c', 'us-east-1', {
            client: INSTALL_SCRIPT
        });

        // Assert
        expect(EventCache).toHaveBeenCalledTimes(1);
        expect((EventCache as any).mock.calls[0][1]).toHaveProperty(
            'client',
            INSTALL_SCRIPT
        );
    });

    test('when session is not recorded then credentials are not set', async () => {
        samplingDecision = false;
        // Init
        const orchestration = new Orchestration('a', 'c', 'us-east-1', {
            telemetries: [],
            identityPoolId: 'dummyPoolId',
            guestRoleArn: 'dummyRoleArn'
        });

        // Assert
        expect(setAwsCredentials).toHaveBeenCalledTimes(0);

        // Reset
        samplingDecision = true;
    });

    test('when session is recorded then credentials are set', async () => {
        // Init
        const orchestration = new Orchestration('a', 'c', 'us-east-1', {
            telemetries: [],
            identityPoolId: 'dummyPoolId',
            guestRoleArn: 'dummyRoleArn'
        });

        // Assert
        expect(setAwsCredentials).toHaveBeenCalledTimes(1);
    });
});
