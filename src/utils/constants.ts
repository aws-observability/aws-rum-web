export const CRED_KEY = 'cwr_c';
export const SESSION_COOKIE_NAME = 'cwr_s';
export const USER_COOKIE_NAME = 'cwr_u';
export const CRED_RENEW_MS = 30000;

export const RUM_CUSTOM_ATTRIBUTE_LIMIT_VALUE = 10;
export const DEFAULT_METADATA_FIELDS = [
    'version',
    'browserLanguage',
    'browserName',
    'browserVersion',
    'osName',
    'osVersion',
    'deviceType',
    'platformType',
    'pageUrl',
    'url',
    'pageId',
    'parentPageId',
    'interaction',
    'referrerUrl',
    'pageTitle',
    'title',
    'countryCode',
    'subdivisionCode',
    'domain',
    'pageTags'
];

export const MAX_ATTRIBUTE_KEY_LENGTH = 128;
export const MAX_ATTRIBUTE_KEY_VALUE_LENGTH = 256;
export const ATTRIBUTE_KEY_REGEX = new RegExp(
    `^(?!pageTags)[a-zA-Z0-9_]{1,${MAX_ATTRIBUTE_KEY_LENGTH}}$`
);
export const VALID_ATTRIBUTE_TYPES = ['string', 'boolean', 'number'];
