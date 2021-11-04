import { loader } from './loader';
import { showRequestClientBuilder } from '../test-utils/mock-http-handler';
import { WebVitalsPlugin } from '../plugins/event-plugins/WebVitalsPlugin';
loader('cwr', 'abc123', '1.0', 'us-west-2', './rum_javascript_telemetry.js', {
    dispatchInterval: 0,
    metaDataPluginsToLoad: [],
    eventPluginsToLoad: [new WebVitalsPlugin()],
    telemetries: [],
    clientBuilder: showRequestClientBuilder
});
window.cwr('setAwsCredentials', {
    accessKeyId: 'a',
    secretAccessKey: 'b',
    sessionToken: 'c'
});
