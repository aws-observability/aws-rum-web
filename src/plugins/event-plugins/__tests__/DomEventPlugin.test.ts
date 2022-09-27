import { DomEventPlugin } from '../DomEventPlugin';
import { context, record } from '../../../test-utils/test-utils';
import { DOM_EVENT_TYPE } from '../../utils/constant';

describe('DomEventPlugin tests', () => {
    beforeEach(() => {
        record.mockClear();
    });

    test('schema version is 1.1.0', async () => {
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
                version: '1.1.0'
            })
        );
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
                event: 'click',
                elementId: 'button1'
            })
        );
    });

    test('when listening to document click and event target has no ID, element tag is recorded', async () => {
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
                event: 'click',
                element: 'BUTTON'
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
        const element: HTMLElement = document.querySelector('[label="label1"]');
        element.click();
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(DOM_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject(
            expect.objectContaining({
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
        const elementList: NodeListOf<HTMLElement> = document.querySelectorAll(
            '[label="label1"]'
        );

        elementList.forEach((value: HTMLElement) => {
            value.click();
        });

        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(2);
        record.mock.calls.forEach((call) => {
            expect(call[0]).toEqual(DOM_EVENT_TYPE);
            expect(call[1]).toMatchObject(
                expect.objectContaining({
                    event: 'click',
                    cssLocator: '[label="label1"]'
                })
            );
        });
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
        const element: HTMLElement = document.querySelector('[label="label1"]');
        element.click();
        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
        // Assert
        expect(record).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(DOM_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject(
            expect.objectContaining({
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
                event: 'click',
                elementId: 'button1'
            })
        );
    });

    test('when a DOM event is added at runtime then the DOM event is recorded', async () => {
        // Init
        document.body.innerHTML =
            '<button id="button1" label="label1"></button>';
        const plugin: DomEventPlugin = new DomEventPlugin();

        // Run
        plugin.load(context);

        // Update plugin by registering new DOM event
        plugin.update([{ event: 'click', cssLocator: '[label="label1"]' }]);

        document.getElementById('button1').click();

        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(DOM_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject(
            expect.objectContaining({
                event: 'click',
                cssLocator: '[label="label1"]'
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

        const element: HTMLElement = document.querySelector('[label="label1"]');
        element.click();

        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
        expect(record.mock.calls[0][0]).toEqual(DOM_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject(
            expect.objectContaining({
                event: 'click',
                cssLocator: '[label="label1"]'
            })
        );
    });

    test('when enableMutationObserver is false by default and an element is dynamically added to the DOM then only the event on an existing element is recorded', async () => {
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

        const elementList: NodeListOf<HTMLElement> = document.querySelectorAll(
            '#button1'
        );

        elementList.forEach((value: HTMLElement) => {
            value.click();
        });

        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(1);
        record.mock.calls.forEach((call) => {
            expect(call[0]).toEqual(DOM_EVENT_TYPE);
            expect(call[1]).toMatchObject(
                expect.objectContaining({
                    event: 'click',
                    elementId: 'button1'
                })
            );
        });
    });

    test('when enableMutationObserver is true by default and an element is dynamically added to the DOM then both events identified by the target event are recorded', async () => {
        // Init
        document.body.innerHTML = '<button id="button1"></button>';
        const plugin: DomEventPlugin = new DomEventPlugin({
            enableMutationObserver: true,
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

        const elementList: NodeListOf<HTMLElement> = document.querySelectorAll(
            '#button1'
        );

        elementList.forEach((value: HTMLElement) => {
            value.click();
        });

        plugin.disable();

        // Assert
        expect(record).toHaveBeenCalledTimes(2);
        record.mock.calls.forEach((call) => {
            expect(call[0]).toEqual(DOM_EVENT_TYPE);
            expect(call[1]).toMatchObject(
                expect.objectContaining({
                    event: 'click',
                    elementId: 'button1'
                })
            );
        });
    });

    test('when DomEventPlugin is disabled then event for dynamically added element is not recorded', async () => {
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

        const elementList: NodeListOf<HTMLElement> = document.querySelectorAll(
            '[label="label1"]'
        );

        elementList.forEach((value: HTMLElement) => {
            value.click();
        });

        // Assert
        expect(record).toHaveBeenCalledTimes(0);
    });

    test('when DomEventPlugin is disabled then events for both existing element and a dynamically added element are not recorded', async () => {
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

        const elementList: NodeListOf<HTMLElement> = document.querySelectorAll(
            '[label="label1"]'
        );

        elementList.forEach((value: HTMLElement) => {
            value.click();
        });

        // Assert
        expect(record).toHaveBeenCalledTimes(0);
    });

    test('when an element has an ID then the element ID is recorded', async () => {
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
                event: 'click',
                element: 'BUTTON',
                elementId: 'button1'
            })
        );
    });

    test('when an element has an interaction ID then the interaction ID is recorded', async () => {
        // Init
        document.body.innerHTML =
            '<button id="button1" data-rum-id="rum-button-1"/>';
        const plugin: DomEventPlugin = new DomEventPlugin({
            interactionId: (element) =>
                (element.target as Element).getAttribute('data-rum-id'),
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
                event: 'click',
                element: 'BUTTON',
                elementId: 'button1',
                interactionId: 'rum-button-1'
            })
        );
    });
});
