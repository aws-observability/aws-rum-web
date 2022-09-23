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
        credentials
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
