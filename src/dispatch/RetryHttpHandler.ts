import { HttpHandler, HttpRequest, HttpResponse } from '@aws-sdk/protocol-http';
import { is2xx, is429, is5xx } from '../plugins/utils/http-utils';

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
        backoff: BackoffFunction = (n) => 2000 * Math.pow(2, n - 1)
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
                if (is2xx(response.response.statusCode)) {
                    return response;
                }
                throw response.response.statusCode;
            } catch (e) {
                if (typeof e === 'number' && !is429(e) && !is5xx(e)) {
                    // Fail immediately on client errors because they will never succeed.
                    // Only retry when request is throttled (429) or received server error (5xx).
                    throw new Error(`${e}`);
                }

                if (retriesLeft <= 0) {
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
}
