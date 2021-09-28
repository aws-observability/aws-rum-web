import { PAGE_ID_FORMAT } from '../../../orchestration/Orchestration';
import { context } from '../../../test-utils/test-utils';
import { PageViewPlugin } from '../PageViewPlugin';

const PAGE_VIEW_ONE_PATH = '/page_view_one?region=us-west-1#lang';
const PAGE_VIEW_TWO_PATH = '/page_view_two?region=us-west-1#lang';

const PAGE_VIEW_ONE_EXPECTED_PAGE_ID = '/page_view_one';
const PAGE_VIEW_TWO_EXPECTED_PAGE_ID = '/page_view_two';

describe('PageViewPlugin tests', () => {
    let url;

    beforeAll(() => {
        url = window.location.toString();
    });

    beforeEach(() => {
        // @ts-ignore
        context.recordPageView.mockClear();
        // @ts-ignore
        jsdom.reconfigure({
            url: url
        });
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
        // @ts-ignore
        expect(context.recordPageView.mock.calls[0][0]).toEqual(
            PAGE_VIEW_ONE_EXPECTED_PAGE_ID
        );
        // @ts-ignore
        expect(context.recordPageView.mock.calls[1][0]).toEqual(
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
        // @ts-ignore
        expect(context.recordPageView.mock.calls[0][0]).toEqual(
            PAGE_VIEW_ONE_EXPECTED_PAGE_ID
        );

        // @ts-ignore
        window.removeEventListener('popstate', plugin.popstateListener);
    });

    test('when a popstate event occurs then a page view event is recorded', async () => {
        // Init
        const plugin = new PageViewPlugin();
        plugin.load(context);

        // Run
        window.history.pushState({}, '', PAGE_VIEW_ONE_PATH);
        dispatchEvent(new PopStateEvent('popstate'));

        // Assert
        // @ts-ignore
        expect(context.recordPageView.mock.calls[0][0]).toEqual(
            PAGE_VIEW_ONE_EXPECTED_PAGE_ID
        );

        // @ts-ignore
        window.removeEventListener('popstate', plugin.popstateListener);
    });

    test('when PATH_AND_HASH is used then a the path and hash is recorded.', async () => {
        // Init
        const plugin = new PageViewPlugin();
        context.config.pageIdFormat = PAGE_ID_FORMAT.PATH_AND_HASH;
        plugin.load(context);

        // Run
        window.history.pushState(
            { state: 'one' },
            'Page One',
            PAGE_VIEW_ONE_PATH
        );

        // Assert
        // @ts-ignore
        expect(context.recordPageView.mock.calls[0][0]).toEqual(
            '/page_view_one#lang'
        );

        context.config.pageIdFormat = PAGE_ID_FORMAT.PATH;
        // @ts-ignore
        window.removeEventListener('popstate', plugin.popstateListener);
    });

    test('when HASH is used then a the hash is recorded.', async () => {
        // Init
        const plugin = new PageViewPlugin();
        context.config.pageIdFormat = PAGE_ID_FORMAT.HASH;
        plugin.load(context);

        // Run
        window.history.pushState(
            { state: 'one' },
            'Page One',
            PAGE_VIEW_ONE_PATH
        );

        // Assert
        // @ts-ignore
        expect(context.recordPageView.mock.calls[0][0]).toEqual('#lang');

        context.config.pageIdFormat = PAGE_ID_FORMAT.PATH;
        // @ts-ignore
        window.removeEventListener('popstate', plugin.popstateListener);
    });

    test('when there is no hash in the URL then only the path is recorded.', async () => {
        // Init
        const plugin = new PageViewPlugin();
        context.config.pageIdFormat = PAGE_ID_FORMAT.PATH_AND_HASH;
        plugin.load(context);

        // Run
        window.history.pushState(
            { state: 'one' },
            'Page One',
            '/page_view_one'
        );

        // Assert
        // @ts-ignore
        expect(context.recordPageView.mock.calls[0][0]).toEqual(
            PAGE_VIEW_ONE_EXPECTED_PAGE_ID
        );

        context.config.pageIdFormat = PAGE_ID_FORMAT.PATH;
        // @ts-ignore
        window.removeEventListener('popstate', plugin.popstateListener);
    });
});
