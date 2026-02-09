import { loader } from './loader';
import { showRequestClientBuilder } from '../test-utils/mock-http-handler';
import { ResourcePlugin } from '../plugins/event-plugins/ResourcePlugin';
loader('cwr', 'abc123', '1.0', 'us-west-2', './rum_javascript_telemetry.js', {
    dispatchInterval: 0,
    metaDataPluginsToLoad: [],
    eventPluginsToLoad: [
        new ResourcePlugin({
            ignore: (entry) =>
                entry.entryType === 'resource' &&
                !/blank\.png/.test(entry.name) &&
                !/rum_javascript_telemetry\.js/.test(entry.name),
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
