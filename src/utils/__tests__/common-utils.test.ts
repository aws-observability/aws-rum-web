import {
    InitiatorType,
    getResourceFileType,
    ResourceType
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
});
