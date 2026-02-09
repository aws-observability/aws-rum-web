import { context } from '../../../test-utils/test-utils';
import { PageViewPlugin } from '../PageViewPlugin';
import { PageIdFormatEnum } from '../../../orchestration/Orchestration';

const PAGE_VIEW_ONE_PATH = '/page_view_one?region=us-west-1#lang';
const PAGE_VIEW_TWO_PATH = '/page_view_two?region=us-west-1#lang';

const PAGE_VIEW_LANDING_EXPECTED_PAGE_ID = '/console/home';
const PAGE_VIEW_LANDING_PATH_AND_HASH_PAGE_ID = '/console/home#feedback';
const PAGE_VIEW_ONE_EXPECTED_PAGE_ID = '/page_view_one';
const PAGE_VIEW_TWO_EXPECTED_PAGE_ID = '/page_view_two';

declare const jsdom: any;

describe('PageViewPlugin tests', () => {
    let url;
    beforeAll(() => {
        url = window.location.toString();
    });

    beforeEach(() => {
        (context.recordPageView as any).mockClear();
        jsdom.reconfigure({
            url
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('when pushState is called then a page view event is recorded.', async () => {
        // Init
        const plugin = new PageViewPlugin();
        plugin.load(context);

        // Run
        window.history.pushState(
            { state: 'one' },
            'Page One',
            PAGE_VIEW_ONE_PATH
        );
        window.history.pushState(
            { state: 'two' },
            'Page Two',
            PAGE_VIEW_TWO_PATH
        );

        // Assert
        expect((context.recordPageView as any).mock.calls[1][0]).toEqual(
            PAGE_VIEW_ONE_EXPECTED_PAGE_ID
        );
        expect((context.recordPageView as any).mock.calls[2][0]).toEqual(
            PAGE_VIEW_TWO_EXPECTED_PAGE_ID
        );

        // @ts-ignore
        window.removeEventListener('popstate', plugin.popstateListener);
    });

    test('when window.history.replaceState() is called then a page view event is recorded', async () => {
        // Init
        const plugin = new PageViewPlugin();
        plugin.load(context);

        // Run
        window.history.replaceState(
            { state: 'one' },
            'Page One',
            PAGE_VIEW_ONE_PATH
        );

        // Assert
        expect((context.recordPageView as any).mock.calls[1][0]).toEqual(
            PAGE_VIEW_ONE_EXPECTED_PAGE_ID
        );

        window.removeEventListener(
            'popstate',
            (plugin as any).popstateListener
        );
    });

    test('when a popstate event occurs then a page view event is recorded', async () => {
        // Init
        const plugin = new PageViewPlugin();
        plugin.load(context);

        // Run
        window.history.pushState({}, '', PAGE_VIEW_ONE_PATH);
        dispatchEvent(new PopStateEvent('popstate'));

        // Assert
        expect((context.recordPageView as any).mock.calls[1][0]).toEqual(
            PAGE_VIEW_ONE_EXPECTED_PAGE_ID
        );

        window.removeEventListener(
            'popstate',
            (plugin as any).popstateListener
        );
    });

    test('when PATH_AND_HASH is used then a the path and hash is recorded.', async () => {
        // Init
        const plugin = new PageViewPlugin();
        context.config.pageIdFormat = PageIdFormatEnum.PathAndHash;
        plugin.load(context);

        // Run
        window.history.pushState(
            { state: 'one' },
            'Page One',
            PAGE_VIEW_ONE_PATH
        );

        // Assert
        expect((context.recordPageView as any).mock.calls[1][0]).toEqual(
            '/page_view_one#lang'
        );

        context.config.pageIdFormat = PageIdFormatEnum.Path;
        window.removeEventListener(
            'popstate',
            (plugin as any).popstateListener
        );
        (context.recordPageView as any).mockClear();
    });

    test('when HASH is used then a the hash is recorded.', async () => {
        // Init
        const plugin = new PageViewPlugin();
        context.config.pageIdFormat = PageIdFormatEnum.Hash;
        plugin.load(context);

        // Run
        window.history.pushState(
            { state: 'one' },
            'Page One',
            PAGE_VIEW_ONE_PATH
        );

        // Assert
        expect((context.recordPageView as any).mock.calls[1][0]).toEqual(
            '#lang'
        );

        context.config.pageIdFormat = PageIdFormatEnum.Path;
        window.removeEventListener(
            'popstate',
            (plugin as any).popstateListener
        );
    });

    test('when there is no hash in the URL then only the path is recorded.', async () => {
        // Init
        const plugin = new PageViewPlugin();
        context.config.pageIdFormat = PageIdFormatEnum.PathAndHash;
        plugin.load(context);

        // Run
        window.history.pushState(
            { state: 'one' },
            'Page One',
            '/page_view_one'
        );

        // Assert
        // @ts-ignore
        expect(context.recordPageView.mock.calls[1][0]).toEqual(
            PAGE_VIEW_ONE_EXPECTED_PAGE_ID
        );

        context.config.pageIdFormat = PageIdFormatEnum.Path;
        window.removeEventListener(
            'popstate',
            (plugin as any).popstateListener
        );
    });

    test('when the plugin is loaded then a page view event is recorded.', async () => {
        // Init
        const plugin = new PageViewPlugin();

        // Run
        plugin.load(context);

        // Assert
        expect((context.recordPageView as any).mock.calls[0][0]).toEqual(
            PAGE_VIEW_LANDING_EXPECTED_PAGE_ID
        );

        window.removeEventListener(
            'popstate',
            (plugin as any).popstateListener
        );
    });

    test('when route change occurs after initial load then recordPageView is invoked twice', async () => {
        // Init
        const plugin = new PageViewPlugin();

        context.config.pageIdFormat = PageIdFormatEnum.PathAndHash;
        plugin.load(context);

        // Run
        window.history.pushState(
            { state: 'one' },
            'Page One',
            '/page_view_one'
        );

        // Assert
        expect((context.recordPageView as any).mock.calls[0][0]).toEqual(
            PAGE_VIEW_LANDING_PATH_AND_HASH_PAGE_ID
        );
        expect((context.recordPageView as any).mock.calls[1][0]).toEqual(
            '/page_view_one'
        );

        // Resetting
        context.config.pageIdFormat = PageIdFormatEnum.Path;
        window.removeEventListener(
            'popstate',
            (plugin as any).popstateListener
        );
    });
});
