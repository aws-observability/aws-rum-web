import * as Utils from '../../test-utils/test-utils';
import { BeaconHttpHandler } from '../BeaconHttpHandler';
import { FetchHttpHandler } from '@aws-sdk/fetch-http-handler';
import { DataPlaneClient } from '../DataPlaneClient';
import { HttpRequest } from '@aws-sdk/protocol-http';
import { advanceTo } from 'jest-date-mock';

const beaconHandler = jest.fn(() => Promise.resolve());
jest.mock('../BeaconHttpHandler', () => ({
    BeaconHttpHandler: jest
        .fn()
        .mockImplementation(() => ({ handle: beaconHandler }))
}));
const fetchHandler = jest.fn(() => Promise.resolve());
jest.mock('@aws-sdk/fetch-http-handler', () => ({
    FetchHttpHandler: jest
        .fn()
        .mockImplementation(() => ({ handle: fetchHandler }))
}));

describe('DataPlaneClient tests', () => {
    beforeEach(() => {
        advanceTo(0);
        beaconHandler.mockClear();
        fetchHandler.mockClear();

        // @ts-ignore
        BeaconHttpHandler.mockImplementation(() => {
            return {
                handle: beaconHandler
            };
        });

        // @ts-ignore
        FetchHttpHandler.mockImplementation(() => {
            return {
                handle: fetchHandler
            };
        });
    });

    test('when sendFetch is used then fetch handler is used', async () => {
        // Init
        const client: DataPlaneClient = new DataPlaneClient({
            fetchRequestHandler: new FetchHttpHandler(),
            beaconRequestHandler: new BeaconHttpHandler(),
            endpoint: Utils.AWS_RUM_ENDPOINT,
            region: Utils.AWS_RUM_REGION,
            credentials: Utils.createAwsCredentials()
        });

        // Run
        await client.sendFetch(Utils.PUT_RUM_EVENTS_REQUEST);

        // Assert
        expect(fetchHandler).toHaveBeenCalledTimes(1);
    });

    test('when sendFetch is used then request contains correct signature header', async () => {
        // Init
        const client: DataPlaneClient = new DataPlaneClient({
            fetchRequestHandler: new FetchHttpHandler(),
            beaconRequestHandler: new BeaconHttpHandler(),
            endpoint: Utils.AWS_RUM_ENDPOINT,
            region: Utils.AWS_RUM_REGION,
            credentials: Utils.createAwsCredentials()
        });

        // Run
        await client.sendFetch(Utils.PUT_RUM_EVENTS_REQUEST);

        // Assert
        const signedRequest: HttpRequest = (fetchHandler.mock
            .calls[0] as any)[0];
        expect(signedRequest.headers['x-amz-date']).toEqual('19700101T000000Z');
        expect(signedRequest.headers['X-Amz-Content-Sha256']).toEqual(
            '57bbd361f5c5ab66d7dafb33d6c8bf714bbb140300fad06145b8d66c388b5d43'
        );
        expect(signedRequest.headers.authorization).toEqual(
            'AWS4-HMAC-SHA256 Credential=abc123/19700101/us-west-2/rum/aws4_request, SignedHeaders=content-type;host;x-amz-content-sha256;x-amz-date, Signature=bf3acf587b119ab12f0f8a86bf12acf7c460eb037584feb0ab5574f297def947'
        );
    });

    test('when sendBeacon is used then beacon handler is used', async () => {
        // Init
        const client: DataPlaneClient = new DataPlaneClient({
            fetchRequestHandler: new FetchHttpHandler(),
            beaconRequestHandler: new BeaconHttpHandler(),
            endpoint: Utils.AWS_RUM_ENDPOINT,
            region: Utils.AWS_RUM_REGION,
            credentials: Utils.createAwsCredentials()
        });

        // Run
        await client.sendBeacon(Utils.PUT_RUM_EVENTS_REQUEST);

        // Assert
        expect(beaconHandler).toHaveBeenCalledTimes(1);
    });

    test('when sendBeacon is used then request contains correct pre-signed url', async () => {
        // Init
        const client: DataPlaneClient = new DataPlaneClient({
            fetchRequestHandler: new FetchHttpHandler(),
            beaconRequestHandler: new BeaconHttpHandler(),
            endpoint: Utils.AWS_RUM_ENDPOINT,
            region: Utils.AWS_RUM_REGION,
            credentials: Utils.createAwsCredentials()
        });

        // Run
        await client.sendBeacon(Utils.PUT_RUM_EVENTS_REQUEST);

        // Assert
        // @ts-ignore
        const signedRequest: HttpRequest = beaconHandler.mock.calls[0][0];
        expect(signedRequest.query['X-Amz-Algorithm']).toEqual(
            'AWS4-HMAC-SHA256'
        );
        expect(signedRequest.query['X-Amz-Content-Sha256']).toEqual(
            '57bbd361f5c5ab66d7dafb33d6c8bf714bbb140300fad06145b8d66c388b5d43'
        );
        expect(signedRequest.query['X-Amz-Credential']).toEqual(
            'abc123/19700101/us-west-2/rum/aws4_request'
        );
        expect(signedRequest.query['X-Amz-Date']).toEqual('19700101T000000Z');
        expect(signedRequest.query['X-Amz-Expires']).toEqual('60');
        expect(signedRequest.query['X-Amz-SignedHeaders']).toEqual(
            'content-type;host'
        );
        expect(signedRequest.query['X-Amz-Signature']).toEqual(
            'd37eb756444ebf6f785233714d6d942f2b20f69292fb09533f6b69556eb0ff2b'
        );
    });

    test('when the endpoint contains a path then the fetch request url contains the path prefix', async () => {
        // Init
        const endpoint = new URL(`${Utils.AWS_RUM_ENDPOINT}${'prod'}`);
        const client: DataPlaneClient = new DataPlaneClient({
            fetchRequestHandler: new FetchHttpHandler(),
            beaconRequestHandler: new BeaconHttpHandler(),
            endpoint,
            region: Utils.AWS_RUM_REGION,
            credentials: Utils.createAwsCredentials()
        });

        // Run
        await client.sendFetch(Utils.PUT_RUM_EVENTS_REQUEST);

        // Assert
        const signedRequest: HttpRequest = (fetchHandler.mock
            .calls[0] as any)[0];
        expect(signedRequest.hostname).toEqual(Utils.AWS_RUM_ENDPOINT.hostname);
        expect(signedRequest.path).toEqual(
            `${endpoint.pathname}/appmonitors/application123/`
        );
    });

    test('when the endpoint path contains a trailing slash then the fetch request url drops the trailing slash', async () => {
        // Init
        const endpoint = new URL(`${Utils.AWS_RUM_ENDPOINT}${'prod/'}`);
        const client: DataPlaneClient = new DataPlaneClient({
            fetchRequestHandler: new FetchHttpHandler(),
            beaconRequestHandler: new BeaconHttpHandler(),
            endpoint,
            region: Utils.AWS_RUM_REGION,
            credentials: Utils.createAwsCredentials()
        });

        // Run
        await client.sendFetch(Utils.PUT_RUM_EVENTS_REQUEST);

        // Assert
        const signedRequest: HttpRequest = (fetchHandler.mock
            .calls[0] as any)[0];
        expect(signedRequest.hostname).toEqual(Utils.AWS_RUM_ENDPOINT.hostname);
        expect(signedRequest.path).toEqual(
            `${endpoint.pathname.replace(
                /\/$/,
                ''
            )}/appmonitors/application123/`
        );
    });

    test('when the endpoint contains a path then the beacon request url contains the path prefix', async () => {
        // Init
        const endpoint = new URL(`${Utils.AWS_RUM_ENDPOINT}${'prod'}`);
        const client: DataPlaneClient = new DataPlaneClient({
            fetchRequestHandler: new FetchHttpHandler(),
            beaconRequestHandler: new BeaconHttpHandler(),
            endpoint,
            region: Utils.AWS_RUM_REGION,
            credentials: Utils.createAwsCredentials()
        });

        // Run
        await client.sendBeacon(Utils.PUT_RUM_EVENTS_REQUEST);

        // Assert
        const signedRequest: HttpRequest = (beaconHandler.mock
            .calls[0] as any)[0];
        expect(signedRequest.hostname).toEqual(Utils.AWS_RUM_ENDPOINT.hostname);
        expect(signedRequest.path).toEqual(
            `${endpoint.pathname}/appmonitors/application123`
        );
    });

    test('when the endpoint path contains a trailing slash then the beacon request url drops the trailing slash', async () => {
        // Init
        const endpoint = new URL(`${Utils.AWS_RUM_ENDPOINT}${'prod/'}`);
        const client: DataPlaneClient = new DataPlaneClient({
            fetchRequestHandler: new FetchHttpHandler(),
            beaconRequestHandler: new BeaconHttpHandler(),
            endpoint,
            region: Utils.AWS_RUM_REGION,
            credentials: Utils.createAwsCredentials()
        });

        // Run
        await client.sendBeacon(Utils.PUT_RUM_EVENTS_REQUEST);

        // Assert
        const signedRequest: HttpRequest = (beaconHandler.mock
            .calls[0] as any)[0];
        expect(signedRequest.hostname).toEqual(Utils.AWS_RUM_ENDPOINT.hostname);
        expect(signedRequest.path).toEqual(
            `${endpoint.pathname.replace(/\/$/, '')}/appmonitors/application123`
        );
    });
});
