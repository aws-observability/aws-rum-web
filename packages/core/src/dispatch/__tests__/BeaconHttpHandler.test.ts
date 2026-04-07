import * as Utils from '../../test-utils/test-utils';
import { BeaconHttpHandler } from '../BeaconHttpHandler';
import { DataPlaneClient, SigningConfig } from '../DataPlaneClient';
import { HttpHandler, HttpRequest, HttpResponse } from '@smithy/protocol-http';
import { advanceTo } from 'jest-date-mock';
import { SignatureV4 } from '@smithy/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-js';
import { toHex } from '@smithy/util-hex-encoding';
import { RequestPresigningArguments } from '@aws-sdk/types';

const sendBeacon = jest.fn(() => true);

const SERVICE = 'rum';
const REQUEST_PRESIGN_ARGS: RequestPresigningArguments = { expiresIn: 60 };

const createTestSigningConfig = (): SigningConfig => {
    const credentials = Utils.createAwsCredentials();
    const awsSigV4 = new SignatureV4({
        applyChecksum: true,
        credentials,
        region: Utils.AWS_RUM_REGION,
        service: SERVICE,
        uriEscapePath: true,
        sha256: Sha256
    });
    return {
        sign: async (request: HttpRequest) =>
            (await awsSigV4.sign(request)) as HttpRequest,
        presign: async (request: HttpRequest) =>
            (await awsSigV4.presign(
                request,
                REQUEST_PRESIGN_ARGS
            )) as HttpRequest,
        hashAndEncode: async (payload: string | Uint8Array) => {
            const sha256 = new Sha256();
            sha256.update(payload);
            return toHex(await sha256.digest()).toLowerCase();
        }
    };
};

const createDataPlaneClient = (
    config: { signing: boolean } = { signing: true }
): DataPlaneClient => {
    const beaconHandler = new BeaconHttpHandler();
    const signing = config.signing ? createTestSigningConfig() : undefined;
    return new DataPlaneClient(
        {
            fetchRequestHandler: {} as HttpHandler,
            beaconRequestHandler: beaconHandler,
            endpoint: Utils.AWS_RUM_ENDPOINT,
            region: Utils.AWS_RUM_REGION,
            credentials: config.signing
                ? Utils.createAwsCredentials()
                : undefined
        },
        signing
    );
};

describe('BeaconHttpHandler tests', () => {
    beforeEach(() => {
        advanceTo(0);
        sendBeacon.mockClear();
        global.navigator.sendBeacon = sendBeacon;
    });

    test('when sendBeacon succeeds then HttpResponse status is 200', async () => {
        // Init
        const client: DataPlaneClient = createDataPlaneClient();

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
        const client: DataPlaneClient = createDataPlaneClient();

        // Run
        const response: Promise<{ response: HttpResponse }> = client.sendBeacon(
            Utils.PUT_RUM_EVENTS_REQUEST
        );
        // Assert
        return expect(response).rejects.toEqual(undefined);
    });

    test('sendBeacon builds correct url', async () => {
        // Init
        const client: DataPlaneClient = createDataPlaneClient();

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

    test('when signing is false then sendBeacon omits the signature', async () => {
        // Init
        const client: DataPlaneClient = createDataPlaneClient({
            signing: false
        });

        // Run
        const response: HttpResponse = (
            await client.sendBeacon(Utils.PUT_RUM_EVENTS_REQUEST)
        ).response;

        // Assert
        const url: string = (sendBeacon.mock.calls[0] as any)[0];
        expect(url).toEqual(
            'https://rumservicelambda.us-west-2.amazonaws.com/appmonitors/application123'
        );
    });
});
