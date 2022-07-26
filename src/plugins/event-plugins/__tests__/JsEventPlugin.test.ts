import { JsEventPlugin } from '../JsEventPlugin';
import { context, getSession, record } from '../../../test-utils/test-utils';
import { JS_GENERAL_EVENT_TYPE } from '../../utils/constant';

describe('JsEventPlugin tests', () => {
    beforeEach(() => {
        record.mockClear();
        getSession.mockClear();
    });

    test('when a string is sent then the plugin records the event name', async () => {
        const plugin: JsEventPlugin = new JsEventPlugin();

        // Run
        plugin.load(context);

        plugin.record('some-event');

        // Assert
        expect(record.mock.calls[0][0]).toEqual(JS_GENERAL_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject({
            name: 'some-event'
        });
    });

    test('when a JsEvent object is sent then the plugin records the event name and data', async () => {
        const plugin: JsEventPlugin = new JsEventPlugin();

        // Run
        plugin.load(context);

        plugin.record({ name: 'some-event', data: 'event data' });

        // Assert
        expect(record.mock.calls[0][0]).toEqual(JS_GENERAL_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject({
            name: 'some-event',
            data: 'event data'
        });
    });

    test('when plugin disabled then plugin does not record events', async () => {
        const plugin: JsEventPlugin = new JsEventPlugin();

        // Run
        plugin.load(context);
        plugin.disable();

        plugin.record('Something happened');

        // Assert
        expect(record).toHaveBeenCalledTimes(0);
    });

    test('when enabled then plugin records events', async () => {
        const plugin: JsEventPlugin = new JsEventPlugin();
        plugin.load(context);

        plugin.record('Something happened');
        expect(record).toHaveBeenCalledTimes(1);
    });

    test('when ignore passed, ignore certain events', async () => {
        const plugin: JsEventPlugin = new JsEventPlugin({
            ignore(event) {
                return event.name === 'Something happened';
            }
        });

        plugin.load(context);

        plugin.record('Something happened');
        expect(record).toHaveBeenCalledTimes(0);

        plugin.record('Something else happened');
        expect(record).toHaveBeenCalledTimes(1);

        plugin.record('Something happened');
        expect(record).toHaveBeenCalledTimes(1);
    });
});
