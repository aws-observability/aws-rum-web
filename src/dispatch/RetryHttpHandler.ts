import { HttpHandler, HttpRequest, HttpResponse } from '@aws-sdk/protocol-http';

export type BackoffFunction = (retry: number) => number;

/**
 * An HttpHandler which wraps other HttpHandlers to retry requests.
 *
 * Requests will be retried if (1) there is an error (e.g., with the network or
 * credentials) and the promise rejects, or (2) the response status is not 2xx.
 */
export class RetryHttpHandler implements HttpHandler {
    private handler: HttpHandler;
    private retries: number;
    private backoff: BackoffFunction;

    public constructor(
        handler: HttpHandler,
        retries: number,
        backoff: BackoffFunction = (n) => n * 2000
    ) {
        this.handler = handler;
        this.retries = retries;
        this.backoff = backoff;
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
                await this.sleep(this.backoff(this.retries - retriesLeft));
            }
        }
    }

    private async sleep(milliseconds: number): Promise<void> {
        return new Promise<void>((resolve) =>
            setTimeout(resolve, milliseconds)
        );
    }

    private isStatusCode2xx = (statusCode: number): boolean => {
        return statusCode >= 200 && statusCode < 300;
    };
}
