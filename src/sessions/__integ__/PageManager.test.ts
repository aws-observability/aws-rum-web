import { Selector } from 'testcafe';
import { REQUEST_BODY } from '../../test-utils/integ-test-utils';
import { PAGE_VIEW_EVENT_TYPE } from '../../plugins/utils/constant';

const recordPageView: Selector = Selector(`#recordPageView`);
const recordPageViewWithPageTagAttribute: Selector = Selector(
    `#recordPageViewWithPageTagAttribute`
);
const recordPageViewWithCustomPageAttributes: Selector = Selector(
    `#recordPageViewWithCustomPageAttributes`
);
const dispatch: Selector = Selector(`#dispatch`);
const clear: Selector = Selector(`#clearRequestResponse`);
const doNotRecordPageView = Selector(`#doNotRecordPageView`);

fixture('PageViewEventPlugin').page('http://localhost:8080/page_event.html');

const removeUnwantedEvents = (json: any) => {
    for (let i = 0; i < json.RumEvents.length; i++) {
        if (/(session_start_event)/.test(json.RumEvents[i].type)) {
            json.RumEvents.splice(i, 1);
        }
    }
    return json;
};

test('PageViewEventPlugin records landing page view event', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t
        .wait(300)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const json = removeUnwantedEvents(
        JSON.parse(await REQUEST_BODY.textContent)
    );
    const eventType = json.RumEvents[0].type;
    const eventDetails = JSON.parse(json.RumEvents[0].details);
    const metaData = JSON.parse(json.RumEvents[0].metadata);

    await t
        .expect(eventType)
        .eql(PAGE_VIEW_EVENT_TYPE)
        .expect(eventDetails)
        .contains({
            pageId: '/page_event.html',
            interaction: 0,
            pageInteractionId: '/page_event.html-0'
        })
        .expect(metaData)
        .contains({
            pageId: '/page_event.html',
            title: 'RUM Integ Test'
        });
});

test('PageViewEventPlugin records page view event', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.

    await t
        .wait(300)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId')
        .click(clear)
        .click(recordPageView)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const json = removeUnwantedEvents(
        JSON.parse(await REQUEST_BODY.textContent)
    );
    const eventType = json.RumEvents[0].type;
    const eventDetails = JSON.parse(json.RumEvents[0].details);
    const metaData = JSON.parse(json.RumEvents[0].metadata);

    await t
        .expect(eventType)
        .eql(PAGE_VIEW_EVENT_TYPE)
        .expect(eventDetails)
        .contains({
            pageId: '/page_view_two',
            interaction: 1,
            pageInteractionId: '/page_view_two-1',
            parentPageInteractionId: '/page_event.html-0'
        })
        .expect(metaData)
        .contains({
            pageId: '/page_view_two',
            title: 'RUM Integ Test'
        });
});

test('when page is denied then page view is not recorded', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.

    await t
        .wait(300)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId')
        .click(clear)
        .click(recordPageView)
        .click(doNotRecordPageView)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const requestBody = JSON.parse(await REQUEST_BODY.textContent);

    const pages = requestBody.RumEvents.filter(
        (e) => e.type === PAGE_VIEW_EVENT_TYPE
    ).map((e) => JSON.parse(e.details));

    await t.expect(pages.length).eql(1).expect(pages[0]).contains({
        pageId: '/page_view_two',
        interaction: 1,
        pageInteractionId: '/page_view_two-1'
    });
});

test('when pageTag attribute is passed in when manually recording page view event, then PageViewEventPlugin records pageTag data in metadata', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.

    await t
        .wait(300)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId')
        .click(clear)
        .click(recordPageViewWithPageTagAttribute)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const json = removeUnwantedEvents(
        JSON.parse(await REQUEST_BODY.textContent)
    );
    const eventType = json.RumEvents[0].type;
    const eventDetails = JSON.parse(json.RumEvents[0].details);
    const metaData = JSON.parse(json.RumEvents[0].metadata);

    await t
        .expect(eventType)
        .eql('com.amazon.rum.page_view_event')
        .expect(eventDetails)
        .contains({
            pageId: '/page_view_two',
            interaction: 1,
            pageInteractionId: '/page_view_two-1',
            parentPageInteractionId: '/page_event.html-0'
        })
        .expect(metaData)
        .contains({
            pageId: '/page_view_two',
            title: 'RUM Integ Test'
        })
        .expect(metaData.pageTags[0])
        .eql('pageGroup1');
});

test('when custom page attributes are set when manually recording page view event, then PageViewEventPlugin records custom page attributes in metadata', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.

    await t
        .wait(300)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId')
        .click(clear)
        .click(recordPageViewWithCustomPageAttributes)
        .click(dispatch)
        .expect(REQUEST_BODY.textContent)
        .contains('BatchId');

    const json = removeUnwantedEvents(
        JSON.parse(await REQUEST_BODY.textContent)
    );
    const eventType = json.RumEvents[0].type;
    const eventDetails = JSON.parse(json.RumEvents[0].details);
    const metaData = JSON.parse(json.RumEvents[0].metadata);

    await t
        .expect(eventType)
        .eql('com.amazon.rum.page_view_event')
        .expect(eventDetails)
        .contains({
            pageId: '/page_view_two',
            interaction: 1,
            pageInteractionId: '/page_view_two-1',
            parentPageInteractionId: '/page_event.html-0'
        })
        .expect(metaData)
        .contains({
            pageId: '/page_view_two',
            title: 'RUM Integ Test',
            customPageAttributeString: 'customPageAttributeValue',
            customPageAttributeNumber: 1,
            customPageAttributeBoolean: true
        });
});
