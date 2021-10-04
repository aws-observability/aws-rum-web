import { Selector } from 'testcafe';

export const STATUS_202 = 202;
export const BUTTON_ID_1 = 'button1';
export const BUTTON_ID_2 = 'button2';
export const ID = 'id';
export const TIMESTAMP = 'timestamp';

export const DISPATCH_COMMAND = 'dispatch';
export const DISABLE_COMMAND = 'disable';
export const ENABLE_COMMAND = 'enable';

export const COMMAND: Selector = Selector('#command');
export const PAYLOAD: Selector = Selector('#payload');
export const SUBMIT: Selector = Selector('#submit');

export const REQUEST_URL: Selector = Selector('#request_url');
export const REQUEST_HEADER: Selector = Selector('#request_header');
export const REQUEST_BODY: Selector = Selector('#request_body');

export const RESPONSE_STATUS: Selector = Selector('#response_status');
export const RESPONSE_HEADER: Selector = Selector('#response_header');
export const RESPONSE_BODY: Selector = Selector('#response_body');
