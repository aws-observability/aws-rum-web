import { WEB_CLIENT_VERSION } from '../../src/utils/version';

describe('version', () => {
    test('WEB_CLIENT_VERSION matches package.json version', () => {
        expect(WEB_CLIENT_VERSION).toEqual('3.0.0');
    });
});
