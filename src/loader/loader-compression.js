import { loader } from './loader';
import { showRequestClientBuilder } from '../test-utils/mock-http-handler';

// Test compression with a large payload by generating many events
loader('cwr', 'abc123', '1.0', 'us-west-2', './rum_javascript_telemetry.js', {
    allowCookies: true,
    dispatchInterval: 0,
    sessionEventLimit: 0,
    sessionSampleRate: 1.0,
    eventPluginsToLoad: [],
    enableXRay: false,
    telemetries: [],
    clientBuilder: showRequestClientBuilder,
    compressionStrategy: { enabled: true },
    debug: true
});
window.cwr('setAwsCredentials', {
    accessKeyId: 'a',
    secretAccessKey: 'b',
    sessionToken: 'c'
});
