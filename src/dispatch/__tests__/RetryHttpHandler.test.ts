import * as Utils from '../../test-utils/test-utils';
import { DataPlaneClient } from '../DataPlaneClient';
import { HttpResponse } from '@aws-sdk/protocol-http';
import { advanceTo } from 'jest-date-mock';
import { RetryHttpHandler } from '../RetryHttpHandler';
import { FetchHttpHandler } from '@aws-sdk/fetch-http-handler';

const fetchHandler = jest.fn<Promise<{}>, []>(() => Promise.resolve({}));
jest.mock('@aws-sdk/fetch-http-handler', () => ({
    FetchHttpHandler: jest
        .fn()
        .mockImplementation(() => ({ handle: fetchHandler }))
}));

describe('RetryHttpHandler tests', () => {
    beforeEach(() => {
        advanceTo(0);
        fetchHandler.mockClear();
        (FetchHttpHandler as jest.Mock).mockImplementation(() => {
            return {
                handle: fetchHandler
            };
        });
    });

    test('when retries run out then request fails', async () => {
        // Init
        const error = 'Something went wrong!';
        fetchHandler.mockReturnValue(Promise.reject(error));

        const retries = 1;
        const retryHandler = new RetryHttpHandler(
            new FetchHttpHandler(),
            retries
        );

        const client: DataPlaneClient = new DataPlaneClient({
            fetchRequestHandler: retryHandler,
            beaconRequestHandler: undefined,
            endpoint: Utils.AWS_RUM_ENDPOINT,
            region: Utils.AWS_RUM_REGION,
            credentials: Utils.createAwsCredentials()
        });

        try {
            // Run
            await client.sendFetch(Utils.PUT_RUM_EVENTS_REQUEST);
        } catch (e) {
            // Assert
            expect(e).toEqual(error);
            expect(fetchHandler).toHaveBeenCalledTimes(2);
            return;
        }

        fail('Request should fail');
    });

    test('when second attempt succeeds then request succeeds', async () => {
        // Init
        const error = 'Something went wrong!';
        const success = { response: { statusCode: 200 } };
        fetchHandler
            .mockReturnValueOnce(Promise.reject(error))
            .mockReturnValue(Promise.resolve(success));

        const retries = 1;
        const retryHandler = new RetryHttpHandler(
            new FetchHttpHandler(),
            retries
        );

        const client: DataPlaneClient = new DataPlaneClient({
            fetchRequestHandler: retryHandler,
            beaconRequestHandler: undefined,
            endpoint: Utils.AWS_RUM_ENDPOINT,
            region: Utils.AWS_RUM_REGION,
            credentials: Utils.createAwsCredentials()
        });

        // Run
        const response: Promise<{ response: HttpResponse }> = client.sendFetch(
            Utils.PUT_RUM_EVENTS_REQUEST
        );

        // Assert
        expect(response).resolves.toBe(success);
    });

    test('when status code is not 2xx then request fails', async () => {
        // Init
        const success = { response: { statusCode: 500 } };
        fetchHandler.mockReturnValue(Promise.resolve(success));

        const retries = 0;
        const retryHandler = new RetryHttpHandler(
            new FetchHttpHandler(),
            retries
        );

        const client: DataPlaneClient = new DataPlaneClient({
            fetchRequestHandler: retryHandler,
            beaconRequestHandler: undefined,
            endpoint: Utils.AWS_RUM_ENDPOINT,
            region: Utils.AWS_RUM_REGION,
            credentials: Utils.createAwsCredentials()
        });

        try {
            // Run
            await client.sendFetch(Utils.PUT_RUM_EVENTS_REQUEST);
        } catch (e) {
            // Assert
            expect(e.message).toEqual('500');
            return;
        }

        fail('Request should fail');
    });

    test('when status code is not 2xx then request retries', async () => {
        // Init
        const badStatus = { response: { statusCode: 500 } };
        const okStatus = { response: { statusCode: 200 } };
        fetchHandler
            .mockReturnValueOnce(Promise.resolve(badStatus))
            .mockReturnValue(Promise.resolve(okStatus));

        const retries = 1;
        const retryHandler = new RetryHttpHandler(
            new FetchHttpHandler(),
            retries
        );

        const client: DataPlaneClient = new DataPlaneClient({
            fetchRequestHandler: retryHandler,
            beaconRequestHandler: undefined,
            endpoint: Utils.AWS_RUM_ENDPOINT,
            region: Utils.AWS_RUM_REGION,
            credentials: Utils.createAwsCredentials()
        });

        // Run
        const response: Promise<{ response: HttpResponse }> = client.sendFetch(
            Utils.PUT_RUM_EVENTS_REQUEST
        );

        // Assert
        expect(response).resolves.toBe(okStatus);
    });
});
