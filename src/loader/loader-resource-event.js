import { loader } from './loader';
import { showRequestClientBuilder } from '../test-utils/mock-http-handler';
import { ResourcePlugin } from '../plugins/event-plugins/ResourcePlugin';
loader('cwr', 'abc123', '1.0', 'us-west-2', './rum_javascript_telemetry.js', {
    dispatchInterval: 0,
    metaDataPluginsToLoad: [],
    eventPluginsToLoad: [new ResourcePlugin()],
    telemetries: [],
    clientBuilder: showRequestClientBuilder
});
window.cwr('setAwsCredentials', {
    accessKeyId: 'a',
    secretAccessKey: 'b',
    sessionToken: 'c'
});
