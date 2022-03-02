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
            '<button label="label1"></button> <button label="label1"></button>';
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

    test('when listening to document click and CSS selector is not specified, CSS selector field not recorded as part of event data', async () => {
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
                event: 'click'
            })
        );
        expect('cssLocator' in record.mock.calls[0][1]).toEqual(false);
    });

    test('when listening to document click and both element ID and CSS selector is specified, only event for element identified by CSS selector is recorded', async () => {
        // Init
        document.body.innerHTML =
            '<button id="button1"></button> <button id = "button2" label="label1"></button>';
        const plugin: DomEventPlugin = new DomEventPlugin({
            events: [
                {
                    event: 'click',
                    elementId: 'button1',
                    cssLocator: '[label="label1"]'
                }
            ]
        });

        // Run
        plugin.load(context);
        document.getElementById('button1').click();
        let element: HTMLElement = document.querySelector(
            '[label="label1"]'
        ) as HTMLElement;
        element.click();
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
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

    test('when listening to document click and both element ID and element is specified, only event for element identified by ID is recorded', async () => {
        // Init
        document.body.innerHTML =
            '<button id="button1"></button> <button id = "button2"></button>';
        const plugin: DomEventPlugin = new DomEventPlugin({
            events: [
                {
                    event: 'click',
                    elementId: 'button1',
                    element: document as any
                }
            ]
        });

        // Run
        plugin.load(context);
        document.getElementById('button1').click();
        document.getElementById('button2').click();
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
        // Assert
        expect(record).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(DOM_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject(
            expect.objectContaining({
                version: '1.0.0',
                event: 'click',
                elementId: 'button1'
            })
        );
    });

    test('when listening for a click on a dynamically added element given an element id, the event is recorded', async () => {
        // Init
        const plugin: DomEventPlugin = new DomEventPlugin({
            events: [{ event: 'click', elementId: 'button1' }]
        });

        // Run
        plugin.load(context);

        // Dynamically add an element
        const newButton = document.createElement('button');
        newButton.id = 'button1';
        document.body.append(newButton);

        // If we click too soon, the MutationObserver callback function will not have added the eventListener the plugin will not record the click.
        await new Promise((r) => setTimeout(r, 100));

        document.getElementById('button1').click();

        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(DOM_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject(
            expect.objectContaining({
                version: '1.0.0',
                event: 'click',
                elementId: 'button1'
            })
        );
    });

    test('when listening for a click on a dynamically added element given a CSS selector, the event is recorded', async () => {
        // Init
        const plugin: DomEventPlugin = new DomEventPlugin({
            events: [{ event: 'click', cssLocator: '[label="label1"]' }]
        });

        // Run
        plugin.load(context);

        // Dynamically add an element
        const newButton = document.createElement('button');
        newButton.setAttribute('label', 'label1');
        document.body.append(newButton);

        // If we click too soon, the MutationObserver callback function will not have added the eventListener the plugin will not record the click.
        await new Promise((r) => setTimeout(r, 100));

        let element: HTMLElement = document.querySelector(
            '[label="label1"]'
        ) as HTMLElement;
        element.click();

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

    test('when listening for a click given an element id on an existing element and a dynamically added element, both events are recorded', async () => {
        // Init
        document.body.innerHTML = '<button id="button1"></button>';
        const plugin: DomEventPlugin = new DomEventPlugin({
            events: [{ event: 'click', cssLocator: '#button1' }]
        });

        // Run
        plugin.load(context);

        // Dynamically add an element
        const newButton = document.createElement('button');
        newButton.id = 'button1';
        document.body.append(newButton);

        // If we click too soon, the MutationObserver callback function will not have added the eventListener the plugin will not record the click.
        await new Promise((r) => setTimeout(r, 100));

        let elementList: NodeListOf<HTMLElement> = document.querySelectorAll(
            '#button1'
        ) as NodeListOf<HTMLElement>;
        for (let i = 0; i < elementList.length; i++) {
            elementList[i].click();
        }

        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(2);
        for (let i = 0; i < record.length; i++) {
            expect(record.mock.calls[i][0]).toEqual(DOM_EVENT_TYPE);
            expect(record.mock.calls[i][1]).toMatchObject(
                expect.objectContaining({
                    version: '1.0.0',
                    event: 'click',
                    elementId: 'button1'
                })
            );
        }
    });

    test('DomEventPlugin does not record event for dynamically added element when disabled', async () => {
        // Init
        const plugin: DomEventPlugin = new DomEventPlugin({
            events: [{ event: 'click', cssLocator: '[label="label1"]' }]
        });

        // Run
        plugin.load(context);

        // Dynamically add an element
        const newButton = document.createElement('button');
        newButton.setAttribute('label', 'label1');
        document.body.append(newButton);

        // If we click too soon, the MutationObserver callback function will not have added the eventListener the plugin will not record the click.
        await new Promise((r) => setTimeout(r, 100));

        plugin.disable();

        let elementList: NodeListOf<HTMLElement> = document.querySelectorAll(
            '[label="label1"]'
        ) as NodeListOf<HTMLElement>;
        for (let i = 0; i < elementList.length; i++) {
            elementList[i].click();
        }

        // Assert
        expect(record).toHaveBeenCalledTimes(0);
    });

    test('DomEventPlugin does not record events when disabled for an existing element and a dynamically added element', async () => {
        // Init
        document.body.innerHTML =
            '<button id = "button2" label="label1"></button>';
        const plugin: DomEventPlugin = new DomEventPlugin({
            events: [{ event: 'click', cssLocator: '[label="label1"]' }]
        });

        // Run
        plugin.load(context);

        // Dynamically add an element
        const newButton = document.createElement('button');
        newButton.setAttribute('label', 'label1');
        document.body.append(newButton);

        // If we click too soon, the MutationObserver callback function will not have added the eventListener the plugin will not record the click.
        await new Promise((r) => setTimeout(r, 100));

        plugin.disable();

        let elementList: NodeListOf<HTMLElement> = document.querySelectorAll(
            '[label="label1"]'
        ) as NodeListOf<HTMLElement>;
        for (let i = 0; i < elementList.length; i++) {
            elementList[i].click();
        }

        // Assert
        expect(record).toHaveBeenCalledTimes(0);
    });

    test('DomEventPlugin registers new DOM events when plugin is updated', async () => {
        // Init
        const plugin: DomEventPlugin = new DomEventPlugin();

        // Run
        plugin.load(context);

        // Update plugin by adding new DOM events
        plugin.update([{ event: 'click', cssLocator: '[label="label1"]' }]);

        plugin.disable();

        const expected = {
            events: [{ event: 'click', cssLocator: '[label="label1"]' }]
        };
        const actual = plugin.getPluginConfig();

        // Assert
        expect(actual).toEqual(expected);
    });
});
