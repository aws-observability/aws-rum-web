import { DomEventPlugin } from '../DomEventPlugin';
import { context, record } from '../../../test-utils/test-utils';
import { DOM_EVENT_TYPE } from '../../utils/constant';

describe('DomEventPlugin tests', () => {
    beforeEach(() => {
        record.mockClear();
    });

    test('DomEventPlugin records events by default', async () => {
        // Init
        document.body.innerHTML = '<button id="button1"/>';
        const plugin: DomEventPlugin = new DomEventPlugin({
            events: [{ event: 'click', elementId: 'button1' }]
        });

        // Run
        plugin.load(context);
        document.getElementById('button1').click();
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
    });

    test('DomEventPlugin does not record events when disabled', async () => {
        // Init
        document.body.innerHTML = '<button id="button1"/>';
        const plugin: DomEventPlugin = new DomEventPlugin({
            events: [{ event: 'click', elementId: 'button1' }]
        });

        // Run
        plugin.load(context);
        plugin.disable();
        document.getElementById('button1').click();

        // Assert
        expect(record).toHaveBeenCalledTimes(0);
    });

    test('DomEventPlugin records events when disabled, then enabled', async () => {
        // Init
        document.body.innerHTML = '<button id="button1"/>';
        const plugin: DomEventPlugin = new DomEventPlugin({
            events: [{ event: 'click', elementId: 'button1' }]
        });

        // Run
        plugin.load(context);
        plugin.disable();
        plugin.enable();
        document.getElementById('button1').click();
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
    });

    test('when listening to document click and event target has an ID, element ID is used as ID', async () => {
        // Init
        document.body.innerHTML = '<button id="button1"/>';
        const plugin: DomEventPlugin = new DomEventPlugin({
            events: [{ event: 'click', element: document as any }]
        });

        // Run
        plugin.load(context);
        document.getElementById('button1').click();
        plugin.disable();

        // Assert
        expect(record.mock.calls[0][0]).toEqual(DOM_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject(
            expect.objectContaining({
                version: '1.0.0',
                event: 'click',
                elementId: 'button1'
            })
        );
    });

    test('when listening to document click and event target has no ID, element tag is used as ID', async () => {
        // Init
        document.body.innerHTML = '<button/>';
        const plugin: DomEventPlugin = new DomEventPlugin({
            events: [{ event: 'click', element: document as any }]
        });

        // Run
        plugin.load(context);
        document.getElementsByTagName('button')[0].click();
        plugin.disable();

        // Assert
        expect(record.mock.calls[0][0]).toEqual(DOM_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject(
            expect.objectContaining({
                version: '1.0.0',
                event: 'click',
                elementId: 'BUTTON'
            })
        );
    });
});
