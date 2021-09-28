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
});
