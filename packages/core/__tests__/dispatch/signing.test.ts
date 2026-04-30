import { createSigningConfig } from '../../src/dispatch/signing';
import { HttpRequest } from '@smithy/protocol-http';

const credentials = {
    accessKeyId: 'abc',
    secretAccessKey: 'xyz',
    sessionToken: 'token'
};

describe('signing', () => {
    test('createSigningConfig returns sign, presign, and hashAndEncode', () => {
        const config = createSigningConfig(credentials, 'us-west-2');
        expect(typeof config.sign).toBe('function');
        expect(typeof config.presign).toBe('function');
        expect(typeof config.hashAndEncode).toBe('function');
    });

    test('sign returns a signed HttpRequest', async () => {
        const config = createSigningConfig(credentials, 'us-west-2');
        const request = new HttpRequest({
            method: 'POST',
            protocol: 'https:',
            hostname: 'dataplane.rum.us-west-2.amazonaws.com',
            path: '/appmonitors/test-id',
            headers: { 'content-type': 'application/json' },
            body: '{"test":true}'
        });
        const signed = await config.sign(request);
        expect(signed.headers['authorization']).toBeDefined();
        expect(signed.headers['x-amz-date']).toBeDefined();
        expect(signed.headers['x-amz-security-token']).toBe('token');
    });

    test('presign returns a request with query string auth', async () => {
        const config = createSigningConfig(credentials, 'us-west-2');
        const request = new HttpRequest({
            method: 'POST',
            protocol: 'https:',
            hostname: 'dataplane.rum.us-west-2.amazonaws.com',
            path: '/appmonitors/test-id',
            headers: {},
            body: 'payload'
        });
        const presigned = await config.presign(request);
        expect(presigned.query).toBeDefined();
        expect(presigned.query!['X-Amz-Signature']).toBeDefined();
        expect(presigned.query!['X-Amz-Credential']).toBeDefined();
        expect(presigned.query!['X-Amz-Expires']).toBe('60');
    });

    test('hashAndEncode returns lowercase hex SHA-256', async () => {
        const config = createSigningConfig(credentials, 'us-west-2');
        const hash = await config.hashAndEncode('test payload');
        expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    test('hashAndEncode produces consistent output', async () => {
        const config = createSigningConfig(credentials, 'us-west-2');
        const hash1 = await config.hashAndEncode('same');
        const hash2 = await config.hashAndEncode('same');
        expect(hash1).toBe(hash2);
    });

    test('hashAndEncode accepts Uint8Array', async () => {
        const config = createSigningConfig(credentials, 'us-west-2');
        const hash = await config.hashAndEncode(new Uint8Array([1, 2, 3]));
        expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
});
