import {
    InitiatorType,
    getResourceFileType,
    ResourceType,
    isPutRumEventsCall
} from '../../utils/common-utils';

describe('Common utils tests', () => {
    test('when initiator type is of group image then resource type is image', async () => {
        // Init
        // Assert
        expect(getResourceFileType(InitiatorType.IMG)).toEqual(
            ResourceType.IMAGE
        );
        expect(getResourceFileType(InitiatorType.IMAGE)).toEqual(
            ResourceType.IMAGE
        );
        expect(getResourceFileType(InitiatorType.INPUT)).toEqual(
            ResourceType.IMAGE
        );
    });

    test('when initiator type is of group document then resource type is document', async () => {
        // Init
        // Assert
        expect(getResourceFileType(InitiatorType.IFRAME)).toEqual(
            ResourceType.DOCUMENT
        );
        expect(getResourceFileType(InitiatorType.FRAME)).toEqual(
            ResourceType.DOCUMENT
        );
    });

    test('when initiator type is of group script then resource type is script', async () => {
        // Init
        // Assert
        expect(getResourceFileType(InitiatorType.SCRIPT)).toEqual(
            ResourceType.SCRIPT
        );
    });

    test('when initiator type is of group stylesheet then resource type is stylesheet', async () => {
        // Init
        // Assert
        expect(getResourceFileType(InitiatorType.CSS)).toEqual(
            ResourceType.STYLESHEET
        );
        expect(getResourceFileType(InitiatorType.LINK)).toEqual(
            ResourceType.STYLESHEET
        );
    });

    test('when url is has endpoint host and path then it is a PutRumEvents call', async () => {
        const endpointHost = 'dataplane.rum.us-west-2.amazonaws.com';
        const resourceUrl =
            'https://dataplane.rum.us-west-2.amazonaws.com/gamma/application/aa17a42c-e737-48f7-adaf-2e0905f48073/events';
        expect(isPutRumEventsCall(resourceUrl, endpointHost)).toBe(true);
    });

    test('when url has endpoint host but wrong path then it is not a PutRumEvents call', async () => {
        const endpointHost = 'dataplane.rum.us-west-2.amazonaws.com';
        const resourceUrl =
            'https://dataplane.rum.us-west-2.amazonaws.com/user';
        expect(isPutRumEventsCall(resourceUrl, endpointHost)).toBe(false);
    });

    test('when url has wrong host and wrong path then it is not a PutRumEvents call', async () => {
        const endpointHost = 'example.com';
        const resourceUrl =
            'https://dataplane.rum.us-west-2.amazonaws.com/user';
        expect(isPutRumEventsCall(resourceUrl, endpointHost)).toBe(false);
    });

    test('when url is invalid then it is not a PutRumEvents call', async () => {
        const endpointHost = 'dataplane.rum.us-west-2.amazonaws.com';
        const resourceUrl =
            'dataplane.rum.us-west-2.amazonaws.com/gamma/application/aa17a42c-e737-48f7-adaf-2e0905f48073/events';
        expect(() => new URL(endpointHost)).toThrowError();
        expect(isPutRumEventsCall(resourceUrl, endpointHost)).toBe(false);
    });
});
