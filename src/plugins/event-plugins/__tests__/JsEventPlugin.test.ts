import { JsEventPlugin } from '../JsEventPlugin';
import { context, getSession, record } from '../../../test-utils/test-utils';
import { JS_GENERAL_EVENT_TYPE } from '../../utils/constant';

describe('JsEventPlugin tests', () => {
    beforeEach(() => {
        record.mockClear();
        getSession.mockClear();
    });

    test('when a string is thrown then the plugin records the name and message', async () => {
        const plugin: JsEventPlugin = new JsEventPlugin();

        // Run
        plugin.load(context);

        plugin.record('Something happened');

        // Assert
        expect(record.mock.calls[0][0]).toEqual(JS_GENERAL_EVENT_TYPE);
        expect(record.mock.calls[0][1]).toMatchObject({
            metadata: 'Something happened'
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
                return event === 'Something happened';
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
