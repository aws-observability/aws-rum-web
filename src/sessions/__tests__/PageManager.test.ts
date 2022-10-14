import { advanceTo } from 'jest-date-mock';
import { PageManager } from '../PageManager';
import { DEFAULT_CONFIG, mockFetch } from '../../test-utils/test-utils';
import { Config } from '../../orchestration/Orchestration';
import { PAGE_VIEW_EVENT_TYPE } from '../../plugins/utils/constant';

import mock from 'xhr-mock';

const record = jest.fn();

declare const jsdom: any;

Object.defineProperty(document, 'referrer', {
    value: 'https://console.aws.amazon.com'
});
Object.defineProperty(document, 'title', { value: 'Amazon AWS Console' });
global.fetch = mockFetch;

describe('PageManager tests', () => {
    let url;

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
            record
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
            record
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
            record
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
            record
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
        const pageManager: PageManager = new PageManager(config, record);

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
            record
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
        const pageManager: PageManager = new PageManager(config, record);
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
            record
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

    test('when the page is manually recorded with custom page attributes then custom page attributes are added to the page attributes', async () => {
        // Init
        const pageManager: PageManager = new PageManager(
            {
                ...DEFAULT_CONFIG,
                allowCookies: true
            },
            record
        );

        pageManager.recordPageView({
            pageId: '/rum/home',
            pageTags: ['pageGroup1'],
            pageAttributes: {
                customPageAttributeString: 'customPageAttributeValue',
                customPageAttributeNumber: 1,
                customPageAttributeBoolean: true
            }
        });

        // Assert
        expect(record.mock.calls[0][0]).toEqual(PAGE_VIEW_EVENT_TYPE);
        expect(pageManager.getAttributes()).toMatchObject({
            pageId: '/rum/home',
            pageTags: ['pageGroup1'],
            customPageAttributeString: 'customPageAttributeValue',
            customPageAttributeNumber: 1,
            customPageAttributeBoolean: true
        });

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when the page is manually recorded with custom page attributes then pageId value at top level takes precendence', async () => {
        // Init
        const pageManager: PageManager = new PageManager(
            {
                ...DEFAULT_CONFIG,
                allowCookies: true
            },
            record
        );

        pageManager.recordPageView({
            pageId: '/rum/home',
            pageTags: ['pageGroup1'],
            pageAttributes: {
                pageId: '/rum/home/override',
                pageTags: 'testingOverride',
                customPageAttributeString: 'customPageAttributeValue',
                customPageAttributeNumber: 1,
                customPageAttributeBoolean: true
            }
        });

        // Assert
        expect(record.mock.calls[0][0]).toEqual(PAGE_VIEW_EVENT_TYPE);
        expect(pageManager.getAttributes()).toMatchObject({
            pageId: '/rum/home',
            pageTags: ['pageGroup1'],
            customPageAttributeString: 'customPageAttributeValue',
            customPageAttributeNumber: 1,
            customPageAttributeBoolean: true
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
        const pageManager: PageManager = new PageManager(config, record);

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
            record
        );
        const helper = pageManager['virtualPageLoadTimer'];
        const startTiming = jest.spyOn(helper, 'startTiming');

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
        expect(helper['isPageLoaded']).toEqual(true);
        expect(helper['timeoutCheckerId']).toEqual(undefined);
        expect(helper['periodicCheckerId']).toEqual(undefined);

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
            record
        );
        const helper = pageManager['virtualPageLoadTimer'];
        const startTiming = jest.spyOn(helper, 'startTiming');

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
        expect(helper['isPageLoaded']).toEqual(true);
        expect(helper['timeoutCheckerId']).toEqual(undefined);
        expect(helper['periodicCheckerId']).toEqual(undefined);

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
            record
        );
        const helper = pageManager['virtualPageLoadTimer'];
        const startTiming = jest.spyOn(helper, 'startTiming');

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
        expect(helper['isPageLoaded']).toEqual(false);
        expect(helper['timeoutCheckerId']).not.toEqual(undefined);
        expect(helper['periodicCheckerId']).not.toEqual(undefined);
    });

    test('when latestInteractionTime is outside the scope of routeChangeTimeout then page.start is Date.now', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);
        const helper = pageManager['virtualPageLoadTimer'];
        const startTiming = jest.spyOn(helper, 'startTiming');

        // Mocking Date.now
        Date.now = jest.fn(() => 3000);
        helper.latestInteractionTime = 500;

        // Run
        pageManager.resumeSession('/console/home', 1);
        pageManager.recordPageView('/console/home');
        pageManager.recordPageView('/rum/home');

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
        const pageManager: PageManager = new PageManager(config, record);
        const helper = pageManager['virtualPageLoadTimer'];
        const startTiming = jest.spyOn(helper, 'startTiming');

        // Mocking Date.now
        Date.now = jest.fn(() => 3000);
        helper.latestInteractionTime = 2500;

        // Run
        pageManager.resumeSession('/console/home', 1);
        pageManager.recordPageView('/console/home');
        pageManager.recordPageView('/rum/home');

        // Should timing
        expect(startTiming).toBeCalledTimes(1);
        expect(pageManager.getPage().start).toEqual(2500);
    });
});
