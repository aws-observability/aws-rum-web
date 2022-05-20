import { PluginManager } from '../PluginManager';
import {
    DemoPlugin,
    DEMO_EVENT_TYPE,
    DEMO_PLUGIN_ID
} from '../event-plugins/DemoPlugin';
import { context } from '../../test-utils/test-utils';

describe('Plugins tests', () => {
    test('add a valid plugin', async () => {
        // Init
        const pluginManager: PluginManager = new PluginManager(context);
        const demoPlugin: DemoPlugin = new DemoPlugin();

        // Run
        pluginManager.addPlugin(demoPlugin);

        // Assert
        expect(pluginManager.hasPlugin(demoPlugin.getPluginId())).toBeTruthy();
    });

    test('when data is recorded to an invalid plugin then the plugin manager throws an error', async () => {
        // Init
        const pluginManager: PluginManager = new PluginManager(context);

        // Run and Assert
        expect(() => pluginManager.record('does_not_exist', {})).toThrowError(
            new Error('AWS RUM Client record: Invalid plugin ID')
        );
    });

    test('when the application manually records data then the plugin records the error', async () => {
        // Init
        const pluginManager: PluginManager = new PluginManager(context);
        const demoPlugin: DemoPlugin = new DemoPlugin();
        pluginManager.addPlugin(demoPlugin);

        // Run
        pluginManager.record(DEMO_PLUGIN_ID, 'data to record');

        // Assert
        expect(context.record).toHaveBeenCalledTimes(1);
        // @ts-ignore
        expect(context.record.mock.calls[0][0]).toEqual(DEMO_EVENT_TYPE);
    });
});
