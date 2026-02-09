import { loader } from './loader';
import { showRequestClientBuilder } from '../test-utils/mock-http-handler';

// Add plugin
class CustomPlugin {
    constructor() {
        this.enabled;
        this.context;
        this.id = 'custom_event_plugin';
    }
    load(context) {
        this.context = context;
    }
    enable() {
        this.enabled = true;
        window.addEventListener('custom_events', () => {
            this.context.record(this.id, {
                stringField: 'string',
                intField: 1,
                nestedField: { subfield: 1 }
            });
        });
        window.addEventListener('empty_custom_events', () => {
            this.context.record(this.id, {});
        });
    }
    disable() {
        this.enabled = false;
        window.removeEventListener('custom_events', () => {
            this.context.record(this.id, {
                stringField: 'string',
                intField: 1,
                nestedField: { subfield: 1 }
            });
        });
        window.removeEventListener('empty_custom_events', () => {
            this.context.record(this.id, {});
        });
    }
    getPluginId() {
        return this.id;
    }
}

loader('cwr', 'abc123', '1.0', 'us-west-2', './rum_javascript_telemetry.js', {
    allowCookies: true,
    dispatchInterval: 0,
    telemetries: ['performance'],
    eventPluginsToLoad: [new CustomPlugin()],
    clientBuilder: showRequestClientBuilder
});
window.cwr('setAwsCredentials', {
    accessKeyId: 'a',
    secretAccessKey: 'b',
    sessionToken: 'c'
});
