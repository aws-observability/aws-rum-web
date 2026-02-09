import { HttpRequest, HttpResponse } from '@smithy/protocol-http';
import { HeaderBag } from '@aws-sdk/types';

const setElementText = (name: string, text: string) => {
    const element = document.getElementById(name);
    if (element) {
        element.textContent = text;
    }
};

const headerBagToString = (headers: HeaderBag): string => {
    let serial = '';
    let i = 0;
    for (const key in headers) {
        if (headers.hasOwnProperty(key)) {
            if (i) {
                serial += '; ' + key + '=' + headers[key];
            } else {
                serial += key + '=' + headers[key];
            }
            i++;
        }
    }
    return serial;
};

export const logRequestToPage = (request: HttpRequest) => {
    setElementText(
        'request_url',
        request.protocol + '//' + request.hostname + request.path
    );
    setElementText('request_header', headerBagToString(request.headers));

    // Handle both string and Uint8Array (compressed) bodies
    if (request.body instanceof Uint8Array) {
        setElementText(
            'request_body',
            `[compressed: ${request.body.length} bytes]`
        );
        setElementText('request_compressed', 'true');
        setElementText('request_compressed_size', String(request.body.length));
    } else {
        setElementText('request_body', request.body);
        setElementText('request_compressed', 'false');
        setElementText(
            'request_uncompressed_size',
            String(request.body.length)
        );
    }
};

export const logResponseToPage = (response: HttpResponse) => {
    setElementText('response_status', response.statusCode.toString());
    setElementText('response_header', headerBagToString(response.headers));
    setElementText('response_body', response.body);
};
