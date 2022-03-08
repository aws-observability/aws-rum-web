import { advanceTo } from 'jest-date-mock';
import { PageManager, PAGE_VIEW_TYPE } from '../PageManager';
import {
    DEFAULT_CONFIG,
    mockFetch,
    mockFetchWith500,
    mockFetchWithError,
    mockFetchWithErrorObject,
    mockFetchWithErrorObjectAndStack
} from '../../test-utils/test-utils';
import { Config } from '../../orchestration/Orchestration';
import { PERFORMANCE_NAVIGATION_EVENT_TYPE } from '../../plugins/utils/constant';
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
            url: url
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
        expect(record.mock.calls[0][0]).toEqual(PAGE_VIEW_TYPE);
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
});
