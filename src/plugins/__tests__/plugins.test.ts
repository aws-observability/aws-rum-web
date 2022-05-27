import { PluginManager } from '../PluginManager';
import {
    DemoPlugin,
    DEMO_EVENT_TYPE,
    DEMO_PLUGIN_ID
} from '../event-plugins/DemoPlugin';
import { createPluginManager } from '../../test-utils/test-utils';

describe('Plugins tests', () => {
    test('add a valid plugin', async () => {
        // Init
        const pluginManager: PluginManager = createPluginManager(true);
        const demoPlugin: DemoPlugin = new DemoPlugin();

        // Run
        pluginManager.addPlugin(demoPlugin);

        // Assert
        expect(pluginManager.hasPlugin(demoPlugin.getPluginId())).toBeTruthy();
    });

    test('when data is recorded to an invalid plugin then the plugin manager throws an error', async () => {
        // Init
        const pluginManager: PluginManager = createPluginManager(true);

        // Run and Assert
        expect(() => pluginManager.record('does_not_exist', {})).toThrowError(
            new Error('AWS RUM Client record: Invalid plugin ID')
        );
    });

    test('when the application manually records data then the plugin records the error', async () => {
        // Init
        const pluginManager: PluginManager = createPluginManager(true);
        const demoPlugin: DemoPlugin = new DemoPlugin();
        pluginManager.addPlugin(demoPlugin);

        const recordEvent = jest.spyOn(demoPlugin, 'recordEvent');

        // Run
        pluginManager.record(DEMO_PLUGIN_ID, 'data to record');

        // Assert
        expect(recordEvent).toHaveBeenCalledTimes(1);
        // @ts-ignore
        expect(recordEvent.mock.calls[0][0]).toEqual(DEMO_EVENT_TYPE);
    });
});
