import { HttpResponse } from '@aws-sdk/protocol-http';

export const responseToJson = async (
    response: HttpResponse
): Promise<object> => {
    const { value } = (await response.body.getReader().read()) as {
        value: number[];
    };
    return JSON.parse(String.fromCharCode.apply(null, value)) as object;
};

export const responseToString = async (
    response: HttpResponse
): Promise<string> => {
    const { value } = (await response.body.getReader().read()) as {
        value: number[];
    };
    return String.fromCharCode.apply(null, value);
};
