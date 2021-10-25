import { PageManager, PAGE_VIEW_TYPE } from '../PageManager';
import { DEFAULT_CONFIG } from '../../test-utils/test-utils';

const EXPECTED_ATTRIBUTES = {
    title: 'Amazon AWS Console',
    url:
        'https://us-east-1.console.aws.amazon.com/console/home?region=us-east-1#feedback',
    pageId: '/glue/ajax',
    parentPageId: '/console/home',
    interaction: 1
};

const EXPECTED_PAGE = {
    pageId: '/console/home',
    interaction: 0
};

const EXPECTED_ON_SESSION_START = {
    pageId: '/console/home',
    interaction: 0
};

const EXPECTED_ON_MANUAL = {
    pageId: '/glue/ajax',
    interaction: 1,
    parentPageInteractionId: '/console/home-0'
};

const record = jest.fn();

Object.defineProperty(document, 'referrer', {
    value: 'https://console.aws.amazon.com'
});
Object.defineProperty(document, 'title', { value: 'Amazon AWS Console' });

describe('PageManager tests', () => {
    let url;

    beforeAll(() => {
        url = window.location.toString();
    });

    beforeEach(() => {
        record.mockClear();
        // @ts-ignore
        jsdom.reconfigure({
            url: url
        });
    });

    test('When a session begins then PageManager returns a page view event.', async () => {
        // Init
        const pageManager: PageManager = new PageManager(
            {
                ...DEFAULT_CONFIG
            },
            record
        );

        // Run
        const pageViewEvent = pageManager.startSession();

        // Assert
        expect(pageViewEvent).toMatchObject(EXPECTED_ON_SESSION_START);

        // @ts-ignore
        window.removeEventListener('popstate', pageManager.popstateListener);
    });

    test('When a page is manually recorded then PageManager records a page view event.', async () => {
        // Init
        const pageManager: PageManager = new PageManager(
            {
                ...DEFAULT_CONFIG
            },
            record
        );

        // Run
        pageManager.startSession();
        pageManager.recordPageView('/glue/ajax');

        // Assert
        expect(record.mock.calls[0][0]).toEqual(PAGE_VIEW_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject(EXPECTED_ON_MANUAL);

        // @ts-ignore
        window.removeEventListener('popstate', pageManager.popstateListener);
    });

    test('getPage returns the current page', async () => {
        // Init
        const pageManager: PageManager = new PageManager(
            {
                ...DEFAULT_CONFIG
            },
            record
        );

        // Run
        pageManager.startSession();

        // Assert
        expect(pageManager.getPage()).toMatchObject(EXPECTED_PAGE);

        // @ts-ignore
        window.removeEventListener('popstate', pageManager.popstateListener);
    });

    test('getAttributes returns the attributes for the current page', async () => {
        // Init
        const pageManager: PageManager = new PageManager(
            {
                ...DEFAULT_CONFIG
            },
            record
        );

        // Run
        pageManager.startSession();
        pageManager.recordPageView('/glue/ajax');

        // Assert
        expect(pageManager.getAttributes()).toMatchObject(EXPECTED_ATTRIBUTES);

        // @ts-ignore
        window.removeEventListener('popstate', pageManager.popstateListener);
    });

    test('when pageIdFormat is not recognized then page ID defaults to PATH', async () => {
        // Init
        const pageManager: PageManager = new PageManager(
            {
                ...DEFAULT_CONFIG,
                // @ts-ignore
                pageIdFormat: 'PAGE_AND_HASH'
            },
            record
        );

        // Run
        const pageViewEvent = pageManager.startSession();

        // Assert
        expect(pageViewEvent).toMatchObject(EXPECTED_ON_SESSION_START);

        // @ts-ignore
        window.removeEventListener('popstate', pageManager.popstateListener);
    });
});
