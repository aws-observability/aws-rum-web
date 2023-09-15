import { loader } from './loader';
import { showRequestClientBuilder } from '../test-utils/mock-http-handler';
import { ResourcePlugin } from '../plugins/event-plugins/ResourcePlugin';
loader('cwr', 'abc123', '1.0', 'us-west-2', './rum_javascript_telemetry.js', {
    dispatchInterval: 0,
    metaDataPluginsToLoad: [],
    eventPluginsToLoad: [
        new ResourcePlugin({
            defaultIgnore: (entry) =>
                entry.entryType === 'resource' &&
                (!/^https?:/.test(entry.name) ||
                    /testcafe/.test(entry.targetUrl) ||
                    /dispatch-native-automation-event-sequence/.test(
                        entry.targetUrl
                    )),
            eventLimit: 20,
            recordAllTypes: ['script', 'image'],
            sampleTypes: []
        })
    ],
    telemetries: [],
    clientBuilder: showRequestClientBuilder
});
window.cwr('setAwsCredentials', {
    accessKeyId: 'a',
    secretAccessKey: 'b',
    sessionToken: 'c'
});
