import { HttpHandler, HttpRequest, HttpResponse } from '@aws-sdk/protocol-http';
import { FetchHttpHandler } from '../dispatch/FetchHttpHandler';
import { HttpHandlerOptions } from '@aws-sdk/types';
import { ClientBuilder } from '../dispatch/Dispatch';
import { logRequestToPage, logResponseToPage } from './http-handler-utils';
import { DataPlaneClient } from '../dispatch/DataPlaneClient';
import { BeaconHttpHandler } from '../dispatch/BeaconHttpHandler';

/**
 * Returns data plane service client with a request handler that intercepts
 * requests/responses and prints them to an HTML table.
 *
 * @param endpoint Service endpoint.
 * @param region  Service region.
 * @param credentials AWS credentials.
 */
export const showIntegRequestClientBuilder: ClientBuilder = (
    endpoint,
    region,
    credentials
) => {
    return new DataPlaneClient({
        fetchRequestHandler: new ShowIntegRequestHandler(
            new FetchHttpHandler({ fetchFunction: fetch })
        ),
        beaconRequestHandler: new ShowIntegRequestHandler(
            new BeaconHttpHandler()
        ),
        endpoint,
        region,
        credentials
    });
};

class ShowIntegRequestHandler implements HttpHandler {
    handler: HttpHandler;

    constructor(handler: HttpHandler) {
        this.handler = handler;
    }

    handle(
        request: HttpRequest,
        options?: HttpHandlerOptions
    ): Promise<{ response: HttpResponse }> {
        logRequestToPage(request);
        return this.handler.handle(request, options).then((response) => {
            logResponseToPage(response.response);
            return response;
        });
    }
}
