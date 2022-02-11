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
    test('when listening to document click and event target has CSS selector, element CSS selector is used as CSS selector', async () => {
        // Init
        document.body.innerHTML = '<button label="label1"/>';
        const plugin: DomEventPlugin = new DomEventPlugin({
            events: [{ event: 'click', cssLocator: '[label="label1"]' }]
        });

        // Run
        plugin.load(context);
        let element: HTMLElement = document.querySelector(
            '[label="label1"]'
        ) as HTMLElement;
        element.click();
        // document.getElementsByTagName('button')[0].click();
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(DOM_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject(
            expect.objectContaining({
                version: '1.0.0',
                event: 'click',
                cssLocator: '[label="label1"]'
            })
        );
    });

    test('when listening to document click and two event targets have the same CSS selector, element CSS selector is used as CSS selector for both', async () => {
        // Init
        document.body.innerHTML =
            '<button label="label1"/> <button label="label1"/>';
        const plugin: DomEventPlugin = new DomEventPlugin({
            events: [{ event: 'click', cssLocator: '[label="label1"]' }]
        });

        // Run
        plugin.load(context);
        let elementList: NodeListOf<HTMLElement> = document.querySelectorAll(
            '[label="label1"]'
        ) as NodeListOf<HTMLElement>;
        for (let i = 0; i < elementList.length; i++) {
            elementList[i].click();
        }
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(2);
        for (let i = 0; i < record.mock.calls.length; i++) {
            expect(record.mock.calls[i][0]).toEqual(DOM_EVENT_TYPE);
            expect(record.mock.calls[i][1]).toMatchObject(
                expect.objectContaining({
                    version: '1.0.0',
                    event: 'click',
                    cssLocator: '[label="label1"]'
                })
            );
        }
    });

    test('when listening to document click and event target has no CSS selector, element tag is used as CSS selector', async () => {
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
        expect(record).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(DOM_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject(
            expect.objectContaining({
                version: '1.0.0',
                event: 'click',
                cssLocator: 'BUTTON'
            })
        );
    });
});
