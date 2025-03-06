import { HttpHandler, HttpRequest, HttpResponse } from '@aws-sdk/protocol-http';
import { ClientBuilder } from '../dispatch/Dispatch';
import { DataPlaneClient } from '../dispatch/DataPlaneClient';
import { logRequestToPage, logResponseToPage } from './http-handler-utils';

/**
 * Returns data plane service client with a mocked request handler.
 *
 * @param endpoint Service endpoint.
 * @param region  Service region.
 * @param credentials AWS credentials.
 */
const token =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
export const showRequestClientBuilder: ClientBuilder = (
    endpoint,
    region,
    credentials
) => {
    return new DataPlaneClient({
        fetchRequestHandler: new ShowMockRequestHandler(),
        beaconRequestHandler: new ShowMockRequestHandler(),
        endpoint,
        region,
        credentials,
        headers: {
            Authorization: `Bearer ${token}`,
            'x-api-key': 'a1b2c3d4e5f6',
            'content-type': 'application/json'
        }
    });
};

class ShowMockRequestHandler implements HttpHandler {
    handle(request: HttpRequest): Promise<{ response: HttpResponse }> {
        const response: HttpResponse = {
            statusCode: 202,
            headers: {
                'content-type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: undefined
        };
        logRequestToPage(request);
        logResponseToPage(response);
        return Promise.resolve({ response });
    }
}
