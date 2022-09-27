import { HttpRequest, HttpResponse } from '@aws-sdk/protocol-http';
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
    setElementText('request_body', request.body);
};

export const logResponseToPage = (response: HttpResponse) => {
    setElementText('response_status', response.statusCode.toString());
    setElementText('response_header', headerBagToString(response.headers));
    setElementText('response_body', response.body);
};
