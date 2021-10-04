import { HttpHandler, HttpRequest, HttpResponse } from '@aws-sdk/protocol-http';
import { buildQueryString } from '@aws-sdk/querystring-builder';

export class BeaconHttpHandler implements HttpHandler {
    handle(request: HttpRequest): Promise<{ response: HttpResponse }> {
        const queued = this.sendBeacon(request);
        return new Promise((resolve, reject) => {
            if (queued) {
                resolve({
                    response: new HttpResponse({ statusCode: 200 })
                });
            } else {
                reject();
            }
        });
    }

    private sendBeacon(signedRequest: HttpRequest) {
        let path = signedRequest.path;
        if (signedRequest.query) {
            const queryString = buildQueryString(signedRequest.query);
            if (queryString) {
                path += `?${queryString}`;
            }
        }

        const { port } = signedRequest;
        const url = `${signedRequest.protocol}//${signedRequest.hostname}${
            port ? `:${port}` : ''
        }${path}`;

        return navigator.sendBeacon(url, signedRequest.body);
    }
}
