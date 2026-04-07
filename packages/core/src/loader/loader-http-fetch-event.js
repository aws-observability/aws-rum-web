import { loader } from './loader';
import { showRequestClientBuilder } from '../test-utils/mock-http-handler';
import { FetchPlugin } from '../plugins/event-plugins/FetchPlugin';

const config = {
    logicalServiceName: 'sample.rum.aws.amazon.com',
    recordAllRequests: true,
    addXRayTraceIdHeader: true
};

loader('cwr', 'abc123', '1.0', 'us-west-2', './rum_javascript_telemetry.js', {
    allowCookies: true,
    dispatchInterval: 0,
    eventPluginsToLoad: [new FetchPlugin(config)],
    enableXRay: true,
    telemetries: [],
    clientBuilder: showRequestClientBuilder
});
window.cwr('setAwsCredentials', {
    accessKeyId: 'a',
    secretAccessKey: 'b',
    sessionToken: 'c'
});
