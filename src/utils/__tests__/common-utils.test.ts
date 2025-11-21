import * as utils from '../../utils/common-utils';

describe('Common utils tests', () => {
    test('When URL has "png" file extension then return file type as "image"', async () => {
        // Init
        const resourceUrl =
            'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png';
        // Assert
        expect(utils.getResourceFileType(resourceUrl)).toEqual(
            utils.ResourceType.IMAGE
        );
    });

    test('When URL has "js" file extension then return file type as "script"', async () => {
        // Init
        const resourceUrl =
            'https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js';
        // Assert
        expect(utils.getResourceFileType(resourceUrl)).toEqual(
            utils.ResourceType.SCRIPT
        );
    });

    test('When URL has no file extension then return file type as "other"', async () => {
        // Init
        const resourceUrl =
            'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRTOllsWmffF4hRvZr8ZgQwv4oHKC_Kyksu39SAuqnZ-5OjnwQBGDNojmfu0C8&usqp=CAQ&s=10';
        // Assert
        expect(utils.getResourceFileType(resourceUrl)).toEqual(
            utils.ResourceType.OTHER
        );
    });

    test('When URL has "css" file extension then return file type as "stylesheet"', async () => {
        // Init
        const resourceUrl =
            'https://cdn.sstatic.net/Shared/stacks.css?v=f0ad20c3c35c';
        // Assert
        expect(utils.getResourceFileType(resourceUrl)).toEqual(
            utils.ResourceType.STYLESHEET
        );
    });

    test('When URL has "html" file extension then return file type as "document"', async () => {
        // Init
        const resourceUrl =
            'https://tpc.googlesyndication.com/sodar/sodar2/222/runner.html';
        // Assert
        expect(utils.getResourceFileType(resourceUrl)).toEqual(
            utils.ResourceType.DOCUMENT
        );
    });

    test('When URL has "woff" file extension then return file type as "font"', async () => {
        // Init
        const resourceUrl =
            'https://dco-assets.everestads.net/ics-campaign//5031/t/8417/1/Base/fonts/SegoePro-Semibold.woff';
        // Assert
        expect(utils.getResourceFileType(resourceUrl)).toEqual(
            utils.ResourceType.FONT
        );
    });

    test('when resource is image but file extension is no match, then initiatorType resolves to image', async () => {
        // Init
        const resourceUrl = 'example.com';
        // Assert
        expect(
            utils.getResourceFileType(resourceUrl, utils.InitiatorType.IMG)
        ).toEqual(utils.ResourceType.IMAGE);
        expect(
            utils.getResourceFileType(resourceUrl, utils.InitiatorType.IMAGE)
        ).toEqual(utils.ResourceType.IMAGE);
        expect(
            utils.getResourceFileType(resourceUrl, utils.InitiatorType.INPUT)
        ).toEqual(utils.ResourceType.IMAGE);
    });

    test('when resource is document but file extension is no match, then initiatorType resolves to document', async () => {
        // Init
        const resourceUrl = 'example.com';
        // Assert
        expect(
            utils.getResourceFileType(resourceUrl, utils.InitiatorType.IFRAME)
        ).toEqual(utils.ResourceType.DOCUMENT);
        expect(
            utils.getResourceFileType(resourceUrl, utils.InitiatorType.FRAME)
        ).toEqual(utils.ResourceType.DOCUMENT);
    });

    test('when resource is script but file extension is no match, then initiatorType resolves to script', async () => {
        // Init
        const resourceUrl = 'example.com';
        // Assert
        expect(
            utils.getResourceFileType(resourceUrl, utils.InitiatorType.SCRIPT)
        ).toEqual(utils.ResourceType.SCRIPT);
    });

    test('when resource is stylesheet but file extension is no match, then initiatorType resolves to stylesheet', async () => {
        // Init
        const resourceUrl = 'example.com';
        // Assert
        expect(
            utils.getResourceFileType(resourceUrl, utils.InitiatorType.CSS)
        ).toEqual(utils.ResourceType.STYLESHEET);
    });

    test('when url is has endpoint host and path then it is a PutRumEvents call', async () => {
        const endpointHost = 'dataplane.rum.us-west-2.amazonaws.com';
        const resourceUrl =
            'https://dataplane.rum.us-west-2.amazonaws.com/gamma/appmonitors/aa17a42c-e737-48f7-adaf-2e0905f48073/events';
        expect(utils.isPutRumEventsCall(resourceUrl, endpointHost)).toBe(true);
    });

    test('when url has endpoint host but wrong path then it is not a PutRumEvents call', async () => {
        const endpointHost = 'dataplane.rum.us-west-2.amazonaws.com';
        const resourceUrl =
            'https://dataplane.rum.us-west-2.amazonaws.com/user';
        expect(utils.isPutRumEventsCall(resourceUrl, endpointHost)).toBe(false);
    });

    test('when url has wrong host and wrong path then it is not a PutRumEvents call', async () => {
        const endpointHost = 'example.com';
        const resourceUrl =
            'https://dataplane.rum.us-west-2.amazonaws.com/user';
        expect(utils.isPutRumEventsCall(resourceUrl, endpointHost)).toBe(false);
    });

    test('when url is invalid then it is not a PutRumEvents call', async () => {
        const endpointHost = 'dataplane.rum.us-west-2.amazonaws.com';
        const resourceUrl =
            'dataplane.rum.us-west-2.amazonaws.com/gamma/appmonitors/aa17a42c-e737-48f7-adaf-2e0905f48073/events';
        expect(() => new URL(endpointHost)).toThrowError();
        expect(utils.isPutRumEventsCall(resourceUrl, endpointHost)).toBe(false);
    });

    test('when url has endpoint host, correct path and query params then it is a PutRumEvents call', async () => {
        const endpointHost = 'dataplane.rum.us-east-1.amazonaws.com';
        const resourceUrl =
            'https://dataplane.rum.us-east-1.amazonaws.com/appmonitors/00000000-0000-0000-0000-000000000000?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=<content-sha256>&X-Amz-Credential=<access-key>%2F20251120%2Fus-east-1%2Frum%2Faws4_request&X-Amz-Date=20251120T161054Z&X-Amz-Expires=60';
        expect(utils.isPutRumEventsCall(resourceUrl, endpointHost)).toBe(true);
    });
});
