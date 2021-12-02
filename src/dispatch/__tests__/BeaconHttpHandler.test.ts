import * as Utils from '../../test-utils/test-utils';
import { BeaconHttpHandler } from '../BeaconHttpHandler';
import { DataPlaneClient } from '../DataPlaneClient';
import { HttpResponse } from '@aws-sdk/protocol-http';
import { advanceTo } from 'jest-date-mock';

const sendBeacon = jest.fn(() => true);

describe('BeaconHttpHandler tests', () => {
    beforeEach(() => {
        advanceTo(0);
        sendBeacon.mockClear();
        global.navigator.sendBeacon = sendBeacon;
    });

    test('when sendBeacon succeeds then HttpResponse status is 200', async () => {
        // Init
        const beaconHandler = new BeaconHttpHandler();
        const client: DataPlaneClient = new DataPlaneClient({
            fetchRequestHandler: undefined,
            beaconRequestHandler: beaconHandler,
            endpoint: Utils.AWS_RUM_ENDPOINT,
            region: Utils.AWS_RUM_REGION,
            credentials: Utils.createAwsCredentials()
        });

        // Run
        const response: HttpResponse = (
            await client.sendBeacon(Utils.PUT_RUM_EVENTS_REQUEST)
        ).response;

        // Assert
        expect(response.statusCode).toEqual(200);
    });

    test('when sendBeacon fails then promise is rejected', async () => {
        // Init
        global.navigator.sendBeacon = jest.fn(() => false);
        const beaconHandler = new BeaconHttpHandler();
        const client: DataPlaneClient = new DataPlaneClient({
            fetchRequestHandler: undefined,
            beaconRequestHandler: beaconHandler,
            endpoint: Utils.AWS_RUM_ENDPOINT,
            region: Utils.AWS_RUM_REGION,
            credentials: Utils.createAwsCredentials()
        });

        // Run
        const response: Promise<{ response: HttpResponse }> = client.sendBeacon(
            Utils.PUT_RUM_EVENTS_REQUEST
        );
        // Assert
        return expect(response).rejects.toEqual(undefined);
    });

    test('sendBeacon builds correct url', async () => {
        // Init
        const beaconHandler = new BeaconHttpHandler();
        const client: DataPlaneClient = new DataPlaneClient({
            fetchRequestHandler: undefined,
            beaconRequestHandler: beaconHandler,
            endpoint: Utils.AWS_RUM_ENDPOINT,
            region: Utils.AWS_RUM_REGION,
            credentials: Utils.createAwsCredentials()
        });

        // Run
        const response: HttpResponse = (
            await client.sendBeacon(Utils.PUT_RUM_EVENTS_REQUEST)
        ).response;

        // Assert
        const url: string = (sendBeacon.mock.calls[0] as any)[0];
        expect(url).toContain(
            'https://rumservicelambda.us-west-2.amazonaws.com/appmonitors/application123?X-Amz-Algorithm=AWS4-HMAC-SHA256'
        );
    });
});
