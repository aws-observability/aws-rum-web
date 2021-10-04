import { Selector } from 'testcafe';
import {
    STATUS_202,
    BUTTON_ID_1,
    DISPATCH_COMMAND,
    COMMAND,
    PAYLOAD,
    SUBMIT,
    REQUEST_BODY,
    RESPONSE_STATUS
} from '../../test-utils/integ-test-utils';
import { DOM_EVENT_PLUGIN_ID } from '../../plugins/event-plugins/DomEventPlugin';

import { SESSION_START_EVENT_TYPE } from '../SessionManager';

const randomSessionClickButton: Selector = Selector('#randomSessionClick');
const disallowCookiesClickButton: Selector = Selector('#disallowCookies');

const BROWSER_LANGUAGE = 'browserLanguage';
const BROWSER_NAME = 'browserName';
const BROWSER_VERSION = 'browserVersion';
const OS_NAME = 'osName';
const OS_VERSION = 'osVersion';
const DEVICE_TYPE = 'deviceType';
const PLATFORM_TYPE = 'platformType';

const CONFIGURE_DOM_EVENT_PLUGIN_COMMAND = 'configurePlugin';
const CONFIGURE_DOM_EVENT_PLUGIN_PAYLOAD = `{"pluginId": "${DOM_EVENT_PLUGIN_ID}", "config": [{"event":"click", "elementId":"button1"}]}`;

const button1: Selector = Selector(`#${BUTTON_ID_1}`);

fixture('Session Handler usage').page('http://localhost:8080/');

test('When cookies are enabled, sessionManager records events using cookies', async (t: TestController) => {
    await t.wait(300);

    await t.click(randomSessionClickButton);

    await t.wait(300);

    await t
        .typeText(COMMAND, DISPATCH_COMMAND, { replace: true })
        .click(PAYLOAD)
        .pressKey('ctrl+a delete')
        .click(SUBMIT);

    await t
        .expect(REQUEST_BODY.textContent)
        .contains(SESSION_START_EVENT_TYPE)
        .expect(RESPONSE_STATUS.textContent)
        .eql(STATUS_202.toString());
});

test('When cookie is disabled, sessionManager records events using member variables', async (t: TestController) => {
    await t.wait(300);

    await t.click(disallowCookiesClickButton);

    await t.wait(300);

    await t.click(randomSessionClickButton);

    await t.wait(300);

    await t
        .typeText(COMMAND, DISPATCH_COMMAND, { replace: true })
        .click(PAYLOAD)
        .pressKey('ctrl+a delete')
        .click(SUBMIT);

    await t
        .expect(REQUEST_BODY.textContent)
        .contains(SESSION_START_EVENT_TYPE)
        .expect(RESPONSE_STATUS.textContent)
        .eql(STATUS_202.toString());
});

test('UserAgentMetaDataPlugin records user agent metadata', async (t: TestController) => {
    // If we click too soon, the client/event collector plugin will not be loaded and will not record the click.
    // This could be a symptom of an issue with RUM web client load speed, or prioritization of script execution.
    await t.wait(300);

    // update configure, register click event for button1
    await t
        .typeText(COMMAND, CONFIGURE_DOM_EVENT_PLUGIN_COMMAND, {
            replace: true
        })
        .typeText(PAYLOAD, CONFIGURE_DOM_EVENT_PLUGIN_PAYLOAD, {
            replace: true
        })
        .click(SUBMIT);

    // click button
    await t.click(button1);
    await t
        .typeText(COMMAND, DISPATCH_COMMAND, { replace: true })
        .click(PAYLOAD)
        .pressKey('ctrl+a delete')
        .click(SUBMIT);

    // expect http request body contains user agent matedata
    // expect http response with mock status code 202
    await t
        .expect(REQUEST_BODY.textContent)
        .contains(BROWSER_LANGUAGE)
        .expect(REQUEST_BODY.textContent)
        .contains(BROWSER_NAME)
        .expect(REQUEST_BODY.textContent)
        .contains(BROWSER_VERSION)
        .expect(REQUEST_BODY.textContent)
        .contains(OS_NAME)
        .expect(REQUEST_BODY.textContent)
        .contains(OS_VERSION)
        .expect(REQUEST_BODY.textContent)
        .contains(DEVICE_TYPE)
        .expect(REQUEST_BODY.textContent)
        .contains(PLATFORM_TYPE)
        .expect(RESPONSE_STATUS.textContent)
        .eql(STATUS_202.toString());
});
