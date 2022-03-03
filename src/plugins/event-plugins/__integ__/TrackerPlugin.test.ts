import { Selector } from 'testcafe';
import {
    DISPATCH_COMMAND,
    COMMAND,
    SUBMIT,
    REQUEST_BODY
} from '../../../test-utils/integ-test-utils';
import {
    PAGE_VIEW_EVENT_TYPE,
    PERFORMANCE_NAVIGATION_EVENT_TYPE
} from '../../utils/constant';

const singleProduct: Selector = Selector(`#single_product`);
const close: Selector = Selector('#close');
fixture('SPA TrackerPlugin').page('http://localhost:8080/spa.html');

const navigation_paths = [
    { pageId: '/spa.html', interaction: 0, initiatorType: 'navigation' },
    {
        pageId: '/spa.html#product/1',
        interaction: 1,
        initiatorType: 'route_change'
    },
    { pageId: '/spa.html', interaction: 2, initiatorType: 'route_change' }
];

test('when route change is triggered two times then virtual page load is recorded two times', async (t: TestController) => {
    await t
        .wait(300)
        .click(singleProduct)
        .wait(100)
        .click(close)
        .typeText(COMMAND, DISPATCH_COMMAND, { replace: true })
        .click(SUBMIT)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const nav_events = JSON.parse(
        await REQUEST_BODY.textContent
    ).RumEvents.filter((e) => e.type === PERFORMANCE_NAVIGATION_EVENT_TYPE);

    const page_view_events = JSON.parse(
        await REQUEST_BODY.textContent
    ).RumEvents.filter((e) => e.type === PAGE_VIEW_EVENT_TYPE);

    await t
        .expect(nav_events.length)
        .eql(navigation_paths.length)
        .expect(nav_events.length)
        .eql(page_view_events.length);

    for (let i = 0; i < navigation_paths.length; i++) {
        let expectedItem = navigation_paths[i];

        let navDetail = JSON.parse(nav_events[i].details);
        let navMetadata = JSON.parse(nav_events[i].metadata);

        let pageDetail = JSON.parse(page_view_events[i].details);

        await t
            .expect(navMetadata.pageId)
            .eql(expectedItem.pageId)
            .expect(pageDetail.pageId)
            .eql(expectedItem.pageId)

            .expect(navMetadata.interaction)
            .eql(expectedItem.interaction)
            .expect(pageDetail.interaction)
            .eql(expectedItem.interaction)

            .expect(navDetail.initiatorType)
            .eql(expectedItem.initiatorType)

            .expect(navDetail.duration)
            .gt(0);
    }
});
