// tslint:disable:max-line-length
import { advanceTo } from 'jest-date-mock';
import { PageManager } from '../PageManager';
import {
    createPluginManager,
    DEFAULT_CONFIG,
    mockFetch
} from '../../test-utils/test-utils';
import { Config } from '../../orchestration/Orchestration';
import { PAGE_VIEW_EVENT_TYPE } from '../../plugins/utils/constant';
import { VirtualPageLoadPlugin } from '../../plugins/event-plugins/VirtualPageLoadPlugin';

import mock from 'xhr-mock';

const record = jest.fn();

declare const jsdom: any;

Object.defineProperty(document, 'referrer', {
    value: 'https://console.aws.amazon.com'
});
Object.defineProperty(document, 'title', { value: 'Amazon AWS Console' });
global.fetch = mockFetch;

/* tslint:disable:no-string-literal */
describe('PageManager tests', () => {
    let url: string;

    beforeAll(() => {
        url = window.location.toString();
    });

    beforeEach(() => {
        advanceTo(0);
        mock.setup();
        record.mockClear();
        jsdom.reconfigure({
            url
        });
    });

    afterEach(() => {
        jest.resetModules();
    });

    test('when a page is recorded then PageManager records a page view event.', async () => {
        // Init
        const pageManager: PageManager = new PageManager(
            {
                ...DEFAULT_CONFIG,
                allowCookies: true
            },
            record,
            createPluginManager(true)
        );

        // Run
        pageManager.recordPageView('/console/home');

        // Assert
        expect(record.mock.calls[0][0]).toEqual(PAGE_VIEW_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject({
            pageId: '/console/home',
            interaction: 0
        });

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when no page view has been recorded then getPage returns undefined', async () => {
        // Init
        const pageManager: PageManager = new PageManager(
            {
                ...DEFAULT_CONFIG
            },
            record,
            createPluginManager(true)
        );

        // Assert
        expect(pageManager.getPage()).toEqual(undefined);

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when cookies are enabled then attributes include interaction', async () => {
        // Init
        const pageManager: PageManager = new PageManager(
            {
                ...DEFAULT_CONFIG,
                allowCookies: true
            },
            record,
            createPluginManager(true)
        );

        // Run
        pageManager.recordPageView('/console/home');

        // Assert
        expect(pageManager.getAttributes()).toMatchObject({
            pageId: '/console/home',
            interaction: 0
        });

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when multipe pages are recorded then interaction increments', async () => {
        // Init
        const pageManager: PageManager = new PageManager(
            {
                ...DEFAULT_CONFIG,
                allowCookies: true
            },
            record,
            createPluginManager(true)
        );

        // Run
        pageManager.recordPageView('/console/home');
        pageManager.recordPageView('/rum/home');

        // Assert
        expect(pageManager.getAttributes()).toMatchObject({
            pageId: '/rum/home',
            parentPageId: '/console/home',
            interaction: 1
        });

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when cookies are disabled then interaction increments', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: false
        };
        const pageManager: PageManager = new PageManager(
            config,
            record,
            createPluginManager(true)
        );

        // Run
        pageManager.recordPageView('/console/home');
        config.allowCookies = true;
        pageManager.recordPageView('/rum/home');

        // Assert
        expect(pageManager.getAttributes()).toMatchObject({
            pageId: '/rum/home',
            parentPageId: '/console/home',
            interaction: 1
        });

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when cookies are disabled then attributes do not include interaction', async () => {
        // Init
        const pageManager: PageManager = new PageManager(
            {
                ...DEFAULT_CONFIG,
                allowCookies: false
            },
            record,
            createPluginManager()
        );

        // Run
        pageManager.recordPageView('/console/home');
        pageManager.recordPageView('/rum/home');
        const attributes = pageManager.getAttributes();

        // Assert
        expect(attributes.parentPageId).toEqual(undefined);
        expect(attributes.parentPageId).toEqual(undefined);

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when session is resumed then interaction depth is resumed depth plus one', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(
            config,
            record,
            createPluginManager()
        );
        pageManager.resumeSession('/console/home', 1);

        // Run
        pageManager.recordPageView('/rum/home');

        // Assert
        expect(pageManager.getAttributes()).toMatchObject({
            pageId: '/rum/home',
            parentPageId: '/console/home',
            interaction: 2
        });

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });
    test('when the page is manually recorded with pageTag attribute then page attributes contains pageTag attribute data', async () => {
        // Init
        const pageManager: PageManager = new PageManager(
            {
                ...DEFAULT_CONFIG,
                allowCookies: true
            },
            record,
            createPluginManager(true)
        );

        // Run
        pageManager.recordPageView({
            pageId: '/rum/home',
            pageTags: ['pageGroup1']
        });

        // Assert
        expect(record.mock.calls[0][0]).toEqual(PAGE_VIEW_EVENT_TYPE);
        expect(pageManager.getAttributes()).toMatchObject({
            pageId: '/rum/home',
            pageTags: ['pageGroup1']
        });

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when there is no pageId difference then no pages are created', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(
            config,
            record,
            createPluginManager(true)
        );

        // Run
        pageManager.recordPageView('/rum/home');
        pageManager.recordPageView('/rum/home');
        pageManager.recordPageView('/rum/home');

        // Assert
        expect(record.mock.calls.length).toEqual(1);
        expect(record.mock.calls[0][0]).toEqual(PAGE_VIEW_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject({
            pageId: '/rum/home',
            interaction: 0
        });

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when resumed page is created then virtual page load timing resources are not initialized', async () => {
        // Init
        const pageManager: PageManager = new PageManager(
            {
                ...DEFAULT_CONFIG,
                allowCookies: true
            },
            record,
            createPluginManager(true)
        );
        const helper = pageManager['pluginManager'];
        const pageLoadPlugin = new VirtualPageLoadPlugin(DEFAULT_CONFIG);
        helper.addPlugin(pageLoadPlugin);
        const startTiming = jest.spyOn(pageLoadPlugin, 'startTiming');

        // Run
        pageManager.resumeSession('/console/home', 1);
        pageManager.recordPageView('/rum/home');

        // page view event is recorded
        expect(record.mock.calls.length).toEqual(1);
        expect(record.mock.calls[0][0]).toEqual(PAGE_VIEW_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject({
            pageId: '/rum/home',
            interaction: 2
        });

        // Assert
        expect(startTiming).toBeCalledTimes(0);
        expect(pageLoadPlugin['isPageLoaded']).toEqual(true);
        expect(pageLoadPlugin['timeoutCheckerId']).toEqual(undefined);
        expect(pageLoadPlugin['periodicCheckerId']).toEqual(undefined);

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when landing page is created then virtual page load timing resources are not initialized', async () => {
        // Init
        const pageManager: PageManager = new PageManager(
            {
                ...DEFAULT_CONFIG,
                allowCookies: true
            },
            record,
            createPluginManager(true)
        );
        const helper = pageManager['pluginManager'];

        const pageLoadPlugin = new VirtualPageLoadPlugin(DEFAULT_CONFIG);
        helper.addPlugin(pageLoadPlugin);
        const startTiming = jest.spyOn(pageLoadPlugin, 'startTiming');

        // Run
        pageManager.recordPageView('/rum/home');

        // page view event is recorded
        expect(record.mock.calls.length).toEqual(1);
        expect(record.mock.calls[0][0]).toEqual(PAGE_VIEW_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject({
            pageId: '/rum/home',
            interaction: 0
        });

        // Assert
        expect(startTiming).toBeCalledTimes(0);
        expect(pageLoadPlugin['isPageLoaded']).toEqual(true);
        expect(pageLoadPlugin['timeoutCheckerId']).toEqual(undefined);
        expect(pageLoadPlugin['periodicCheckerId']).toEqual(undefined);

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when next page is created then virtual page load timing resources are initialized', async () => {
        // Init
        const pageManager: PageManager = new PageManager(
            {
                ...DEFAULT_CONFIG,
                allowCookies: true
            },
            record,
            createPluginManager(true)
        );
        const helper = pageManager['pluginManager'];
        const pageLoadPlugin = new VirtualPageLoadPlugin(DEFAULT_CONFIG);
        helper.addPlugin(pageLoadPlugin);
        const startTiming = jest.spyOn(pageLoadPlugin, 'startTiming');

        // Run
        pageManager.recordPageView('/rum/home');
        pageManager.recordPageView('/console/home');

        // page view event is recorded
        expect(record.mock.calls.length).toEqual(2);
        expect(record.mock.calls[1][0]).toEqual(PAGE_VIEW_EVENT_TYPE);
        expect(record.mock.calls[1][1]).toMatchObject({
            pageId: '/console/home',
            interaction: 1
        });

        // Assert
        expect(startTiming).toBeCalledTimes(1);
        expect(pageLoadPlugin['isPageLoaded']).toEqual(false);
        expect(pageLoadPlugin['timeoutCheckerId']).not.toEqual(undefined);
        expect(pageLoadPlugin['periodicCheckerId']).not.toEqual(undefined);
    });

    test('when latestInteractionTime is outside the scope of routeChangeTimeout then page.start is Date.now', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(
            config,
            record,
            createPluginManager()
        );
        const helper = pageManager['pluginManager'];
        const startTiming = jest.spyOn(helper, 'updatePlugin');

        // Mocking Date.now
        Date.now = jest.fn(() => 3000);
        const lastInteractionTime = 1000;

        // Run
        pageManager.resumeSession('/console/home', 1);
        pageManager.recordPageView('/console/home', lastInteractionTime);
        pageManager.recordPageView('/rum/home', lastInteractionTime + 500);

        // Should not time
        expect(startTiming).toBeCalledTimes(0);
        expect(pageManager.getPage().start).toEqual(3000);
    });

    test('when latestInteractionTime is within the scope of routeChangeTimeout then page.start is latestInteractionTime', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(
            config,
            record,
            createPluginManager()
        );
        const helper = pageManager['pluginManager'];
        const startTiming = jest.spyOn(helper, 'updatePlugin');

        // Mocking Date.now
        Date.now = jest.fn(() => 3000);

        // Run
        pageManager.resumeSession('/console/home', 1);
        pageManager.recordPageView('/console/home', Date.now() - 700);
        pageManager.recordPageView('/rum/home', Date.now() - 500);

        // Should timing
        expect(startTiming).toBeCalledTimes(1);
        expect(pageManager.getPage().start).toEqual(2500);
    });
});
