import { loader } from './loader';
import { showRequestClientBuilder } from '../test-utils/mock-http-handler';
import { JsErrorPlugin } from '../plugins/event-plugins/JsErrorPlugin';
loader(
    'cwr',
    'abc123',
    'appname',
    '1.0',
    'us-west-2',
    './rum_javascript_telemetry.js',
    {
        allowCookies: true,
        dispatchInterval: 0,
        metaDataPluginsToLoad: [],
        eventPluginsToLoad: [new JsErrorPlugin()],
        telemetries: [],
        clientBuilder: showRequestClientBuilder
    }
);
window.cwr('setAwsCredentials', {
    accessKeyId: 'a',
    secretAccessKey: 'b',
    sessionToken: 'c'
});
