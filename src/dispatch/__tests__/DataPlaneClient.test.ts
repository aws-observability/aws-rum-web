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
        await client.sendFetch(Utils.LOG_EVENTS_REQUEST);

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
        await client.sendFetch(Utils.LOG_EVENTS_REQUEST);

        // Assert
        // @ts-ignore
        const signedRequest: HttpRequest = fetchHandler.mock.calls[0][0];
        expect(signedRequest.headers['x-amz-date']).toEqual('19700101T000000Z');
        expect(signedRequest.headers['X-Amz-Content-Sha256']).toEqual(
            '396cba73944df10e0fa9919af498b340ab0230f953ce1378a9a620681e767425'
        );
        expect(signedRequest.headers['authorization']).toEqual(
            'AWS4-HMAC-SHA256 Credential=abc123/19700101/us-west-2/rum/aws4_request, SignedHeaders=content-type;host;x-amz-content-sha256;x-amz-date, Signature=3148cd0affbd3bb2b160d1f36a43f146e642783ee3710451de9eac4a78974565'
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
        await client.sendBeacon(Utils.LOG_EVENTS_REQUEST);

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
        await client.sendBeacon(Utils.LOG_EVENTS_REQUEST);

        // Assert
        // @ts-ignore
        const signedRequest: HttpRequest = beaconHandler.mock.calls[0][0];
        expect(signedRequest.query['X-Amz-Algorithm']).toEqual(
            'AWS4-HMAC-SHA256'
        );
        expect(signedRequest.query['X-Amz-Content-Sha256']).toEqual(
            '396cba73944df10e0fa9919af498b340ab0230f953ce1378a9a620681e767425'
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
            'ba005a3be8cbc901e63fca2e83d257a76f45d13e9511df83f73a9ff9f2e23dfb'
        );
    });
});
