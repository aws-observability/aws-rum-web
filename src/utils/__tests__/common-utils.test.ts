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

    test('when url host is rum dataplane and suffix match then is PutRumEvents', async () => {
        const url =
            'https://dataplane.rum.us-west-2.amazonaws.com/appmonitors/265d8f93-d021-44e1-b0c5-41fcc660842f';
        expect(
            isPutRumEventsCall(url, 'dataplane.rum.us-west-2.amazonaws.com')
        ).toBe(true);
    });
    test('when url host is proxy and suffix match then is PutRumEvents call', async () => {
        const url =
            'https://proxy.com/appmonitors/265d8f93-d021-44e1-b0c5-41fcc660842f';
        expect(isPutRumEventsCall(url, 'proxy.com')).toBe(true);
    });

    test('when url host is not endpoint but suffix match then is NOT PutRumEvents call', async () => {
        const url =
            'https://invalid.com/appmonitors/265d8f93-d021-44e1-b0c5-41fcc660842f';
        expect(
            isPutRumEventsCall(url, 'dataplane.rum.us-west-2.amazonaws.com')
        ).toBe(false);
    });

    test('when url host is not endpoint and suffix is invalid then is NOT PutRumEvents call', async () => {
        const url =
            'https://invalid.com/notappmonitors/265d8f93-d021-44e1-b0c5-41fcc660842f';
        expect(isPutRumEventsCall(url, 'proxy.com')).toBe(false);
    });
});
