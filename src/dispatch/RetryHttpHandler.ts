import { HttpHandler, HttpRequest, HttpResponse } from '@aws-sdk/protocol-http';

/**
 * An HttpHandler which wraps other HttpHandlers to retry requests.
 *
 * Requests will be retried if (1) there is an error (e.g., with the network or
 * credentials) and the promise rejects, or (2) the response status is not 2xx.
 */
export class RetryHttpHandler implements HttpHandler {
    private handler: HttpHandler;
    private retries: number;

    public constructor(handler: HttpHandler, retries: number) {
        this.handler = handler;
        this.retries = retries;
    }

    public async handle(
        request: HttpRequest
    ): Promise<{ response: HttpResponse }> {
        let retriesLeft = this.retries;
        while (true) {
            try {
                const response = await this.handler.handle(request);
                if (this.isStatusCode2xx(response.response.statusCode)) {
                    return response;
                }
                throw new Error(`${response.response.statusCode}`);
            } catch (e) {
                if (!retriesLeft) {
                    throw e;
                }
                retriesLeft--;
            }
        }
    }

    private isStatusCode2xx = (statusCode: number): boolean => {
        return statusCode >= 200 && statusCode < 300;
    };
}
