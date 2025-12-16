import { Page } from './../PageManager';
import { advanceTo } from 'jest-date-mock';
import { PageManager } from '../PageManager';
import { DEFAULT_CONFIG, mockFetch } from '../../test-utils/test-utils';
import { Config } from '../../orchestration/Orchestration';
import { PAGE_VIEW_EVENT_TYPE } from '../../plugins/utils/constant';

import mock from 'xhr-mock';

const record = jest.fn();

declare const jsdom: any;

Object.defineProperty(document, 'referrer', {
    value: 'https://console.aws.amazon.com',
    configurable: true
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

    test('when session is resumed  and page view has changed then interaction depth is resumed depth plus one', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);
        pageManager.resumeSession({
            pageId: '/console/home',
            interaction: 1,
            start: Date.now()
        });

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

    test('when session is resumed and the page ID has not changed then interaction depth stays the same', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);
        pageManager.resumeSession({
            pageId: '/console/home',
            interaction: 1,
            start: Date.now()
        });

        // Run
        pageManager.recordPageView('/console/home');

        // Assert
        expect(pageManager.getPage()?.interaction).toEqual(1);

        // Assert
        expect(pageManager.getAttributes()).toMatchObject({
            pageId: '/console/home',
            interaction: 1
        });

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when session resumes and page is manually recorded with custom page attributes then custom page attributes are restored', async () => {
        // Init
        const pageManager: PageManager = new PageManager(
            {
                ...DEFAULT_CONFIG,
                allowCookies: true
            },
            record
        );

        pageManager.resumeSession({
            pageId: '/console/home',
            interaction: 1,
            start: Date.now()
        });

        pageManager.recordPageView({
            pageId: '/console/home',
            pageTags: ['pageGroup1'],
            pageAttributes: {
                customPageAttributeString: 'customPageAttributeValue',
                customPageAttributeNumber: 1,
                customPageAttributeBoolean: true
            }
        });

        // Assert
        expect(record.mock.calls).toHaveLength(0); // No event emitted, but attributes restored in PageManager state
        expect(pageManager.getAttributes()).toMatchObject({
            pageId: '/console/home',
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

    test('when title attribute is provided then provided title takes precedence', async () => {
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
            pageAttributes: {
                title: 'testingOverride'
            }
        });

        // Assert
        expect(record.mock.calls[0][0]).toEqual(PAGE_VIEW_EVENT_TYPE);
        expect(pageManager.getAttributes()).toMatchObject({
            pageId: '/rum/home',
            title: 'testingOverride'
        });

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when no title attribute is provided then document.title is used', async () => {
        // Init
        const pageManager: PageManager = new PageManager(
            {
                ...DEFAULT_CONFIG,
                allowCookies: true
            },
            record
        );

        pageManager.recordPageView({
            pageId: '/rum/home'
        });

        // Assert
        expect(record.mock.calls[0][0]).toEqual(PAGE_VIEW_EVENT_TYPE);
        expect(pageManager.getAttributes()).toMatchObject({
            pageId: '/rum/home',
            title: 'Amazon AWS Console'
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
                allowCookies: true,
                legacyVirtualTiming: true
            },
            record
        );
        const helper = pageManager['virtualPageLoadTimer'];
        const startTiming = jest.spyOn(helper, 'startTiming');

        // Run
        pageManager.resumeSession({
            pageId: '/console/home',
            interaction: 1,
            start: Date.now()
        });
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
                allowCookies: true,
                legacyVirtualTiming: true
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
                allowCookies: true,
                legacyVirtualTiming: true
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
            allowCookies: true,
            legacyVirtualTiming: true
        };
        const pageManager: PageManager = new PageManager(config, record);
        const helper = pageManager['virtualPageLoadTimer'];
        const startTiming = jest.spyOn(helper, 'startTiming');

        // Mocking Date.now
        Date.now = jest.fn(() => 3000);
        helper.latestInteractionTime = 500;

        // Run
        pageManager.resumeSession({
            pageId: '/console/home',
            interaction: 1,
            start: Date.now()
        });
        pageManager.recordPageView('/console/home');
        pageManager.recordPageView('/rum/home');

        // Should not time
        expect(startTiming).toBeCalledTimes(0);
        expect(pageManager.getPage().start).toEqual(3000);
    });

    test('when legacyVirtualTiming is false then virtualPageLoadTimer is not created', async () => {
        // Init
        const pageManager: PageManager = new PageManager(
            {
                ...DEFAULT_CONFIG,
                allowCookies: true,
                legacyVirtualTiming: false
            },
            record
        );

        // Assert
        expect(pageManager['virtualPageLoadTimer']).toBeUndefined();

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when legacyVirtualTiming is false then page navigation works without virtual timing', async () => {
        // Init
        const pageManager: PageManager = new PageManager(
            {
                ...DEFAULT_CONFIG,
                allowCookies: true,
                legacyVirtualTiming: false
            },
            record
        );

        // Run
        pageManager.recordPageView('/rum/home');
        pageManager.recordPageView('/console/home');

        // Assert - page view events are still recorded
        expect(record.mock.calls.length).toEqual(2);
        expect(record.mock.calls[1][0]).toEqual(PAGE_VIEW_EVENT_TYPE);
        expect(record.mock.calls[1][1]).toMatchObject({
            pageId: '/console/home',
            interaction: 1
        });

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when latestInteractionTime is within the scope of routeChangeTimeout then page.start is latestInteractionTime', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true,
            legacyVirtualTiming: true
        };
        const pageManager: PageManager = new PageManager(config, record);
        const helper = pageManager['virtualPageLoadTimer'];
        const startTiming = jest.spyOn(helper, 'startTiming');

        // Mocking Date.now
        Date.now = jest.fn(() => 3000);
        helper.latestInteractionTime = 2500;

        // Run
        pageManager.resumeSession({
            pageId: '/landing',
            interaction: 1,
            start: Date.now()
        });
        pageManager.recordPageView('/about');
        pageManager.recordPageView('/contact');

        // Should timing
        expect(startTiming).toBeCalledTimes(1);
        expect(pageManager.getPage().start).toEqual(2500);
    });

    test('when a page view event is depth 0 then parentPageInteractionId is not defined', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);

        // Mocking Date.now
        Date.now = jest.fn(() => 3000);

        // Record page view
        pageManager.recordPageView('/console/home');

        expect(record.mock.calls[0][0]).toEqual(PAGE_VIEW_EVENT_TYPE);
        expect(record.mock.calls[0][1].timeOnParentPage).toBeUndefined();
    });

    test('when a page view event is above depth 0 then parentPageInteractionId is defined', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);

        // Mocking Date.now
        Date.now = jest.fn(() => 3000);

        // Record page view
        pageManager.recordPageView('/console/home');

        // Mocking Date.now
        Date.now = jest.fn(() => 3500);

        // Record page view
        pageManager.recordPageView('/rum/home');

        // Assert
        expect(record.mock.calls[0][0]).toEqual(PAGE_VIEW_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject({
            pageId: '/console/home',
            interaction: 0
        });

        // Subsequent event records the time on page
        expect(record.mock.calls[1][0]).toEqual(PAGE_VIEW_EVENT_TYPE);
        expect(record.mock.calls[1][1]).toMatchObject({
            pageId: '/rum/home',
            interaction: 1,
            parentPageInteractionId: '/console/home-0',
            timeOnParentPage: 500
        });
    });

    test('when session resumes and page ID has changed then a page view event is recorded', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);
        pageManager.resumeSession({
            pageId: '/console/home',
            interaction: 1,
            start: 24000
        });

        // Mocking Date.now
        Date.now = jest.fn(() => 30000);

        // Run
        pageManager.recordPageView('/rum/home');

        // Assert
        expect(pageManager.getAttributes()).toMatchObject({
            pageId: '/rum/home',
            parentPageId: '/console/home',
            interaction: 2
        });
        expect(pageManager.getPage()?.start).toEqual(30000);

        expect(record.mock.calls[0][0]).toEqual(PAGE_VIEW_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject({
            pageId: '/rum/home',
            interaction: 2,
            parentPageInteractionId: '/console/home-1',
            timeOnParentPage: 6000
        });

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when session resumes and page ID has not changed then page view event is not recorded', async () => {
        // Init
        const config: Config = {
            ...DEFAULT_CONFIG,
            allowCookies: true
        };
        const pageManager: PageManager = new PageManager(config, record);
        pageManager.resumeSession({
            pageId: '/rum/home',
            interaction: 1,
            start: 4321
        });

        // Run
        pageManager.recordPageView('/rum/home');

        // Assert
        expect(pageManager.getPage()?.start).toEqual(4321);
        expect(pageManager.getPage()?.interaction).toEqual(1);
        expect(pageManager.getPage()?.pageId).toEqual('/rum/home');

        // No events therefore length = 0
        expect(record.mock.calls).toHaveLength(0);

        window.removeEventListener(
            'popstate',
            (pageManager as any).popstateListener
        );
    });

    test('when cookies are disabled then time on parent page is not included in event', async () => {
        // Init
        const pageManager: PageManager = new PageManager(
            {
                ...DEFAULT_CONFIG,
                allowCookies: false
            },
            record
        );
        // Mocking Date.now
        Date.now = jest.fn(() => 3000);

        // Record page view
        pageManager.recordPageView('/console/home');

        // Mocking Date.now
        Date.now = jest.fn(() => 3500);

        // Record page view
        pageManager.recordPageView('/rum/home');

        // Assert
        expect(record.mock.calls[1][0]).toEqual(PAGE_VIEW_EVENT_TYPE);
        expect(record.mock.calls[1][1].timeOnParentPage).toBeUndefined();
    });
});

test('when complete referrer is available from the DOM then is recorded in page view event', async () => {
    // Init
    const config: Config = {
        ...DEFAULT_CONFIG,
        allowCookies: true
    };
    const pageManager: PageManager = new PageManager(config, record);

    Object.defineProperty(document, 'referrer', {
        value: 'http://abc.com/consoles',
        configurable: true
    });

    // Run
    pageManager.recordPageView('/console/home');

    // Assert
    expect(pageManager.getPage()).toMatchObject({
        referrer: 'http://abc.com/consoles',
        referrerDomain: 'abc.com',
        pageId: '/console/home'
    });

    window.removeEventListener(
        'popstate',
        (pageManager as any).popstateListener
    );
});

test('when only domain level referrer is available from the DOM then is recorded in page view event', async () => {
    // Init
    const config: Config = {
        ...DEFAULT_CONFIG,
        allowCookies: true
    };
    const pageManager: PageManager = new PageManager(config, record);

    Object.defineProperty(document, 'referrer', {
        value: 'http://abc.com',
        configurable: true
    });
    // Run
    pageManager.recordPageView('/console/home');

    // Assert
    expect(pageManager.getPage()).toMatchObject({
        referrer: 'http://abc.com',
        referrerDomain: 'abc.com',
        pageId: '/console/home'
    });

    window.removeEventListener(
        'popstate',
        (pageManager as any).popstateListener
    );
});

test('when referrer from the DOM is empty then it is recorded as empty in the page view event', async () => {
    // Init
    const config: Config = {
        ...DEFAULT_CONFIG,
        allowCookies: true
    };
    const pageManager: PageManager = new PageManager(config, record);

    Object.defineProperty(document, 'referrer', {
        value: '',
        configurable: true
    });
    // Run
    pageManager.recordPageView('/console/home');

    // Assert
    expect(pageManager.getPage()).toMatchObject({
        pageId: '/console/home',
        referrer: '',
        referrerDomain: ''
    });

    window.removeEventListener(
        'popstate',
        (pageManager as any).popstateListener
    );
});

test('when referrer from the DOM is localhost then referrerDomain is also recorded as localhost', async () => {
    // Init
    const config: Config = {
        ...DEFAULT_CONFIG,
        allowCookies: true
    };
    const pageManager: PageManager = new PageManager(config, record);

    Object.defineProperty(document, 'referrer', {
        value: 'localhost',
        configurable: true
    });
    // Run
    pageManager.recordPageView('/console/home');

    // Assert
    expect(pageManager.getPage()).toMatchObject({
        pageId: '/console/home',
        referrer: 'localhost',
        referrerDomain: 'localhost'
    });

    window.removeEventListener(
        'popstate',
        (pageManager as any).popstateListener
    );
});
