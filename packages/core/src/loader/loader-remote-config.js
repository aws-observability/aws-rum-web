import { loader } from '../loader/loader';
import { showRequestClientBuilder } from '../test-utils/mock-http-handler';
loader(
    'cwr',
    'abc123',
    '1.0',
    'us-west-2',
    './rum_javascript_telemetry.js',
    {
        clientBuilder: showRequestClientBuilder,
        dispatchInterval: 0
    },
    './client-config.json'
);
window.cwr('setAwsCredentials', {
    accessKeyId: 'a',
    secretAccessKey: 'b',
    sessionToken: 'c'
});
