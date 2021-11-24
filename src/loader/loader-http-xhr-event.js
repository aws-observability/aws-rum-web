import { loader } from './loader';
import { showRequestClientBuilder } from '../test-utils/mock-http-handler';
import { XhrPlugin } from '../plugins/event-plugins/XhrPlugin';

const config = {
    logicalServiceName: 'sample.rum.aws.amazon.com',
    urlsToInclude: [/response\.json/],
    recordAllRequests: true,
    addXRayTraceIdHeader: true
};

loader('cwr', 'abc123', '1.0', 'us-west-2', './rum_javascript_telemetry.js', {
    allowCookies: true,
    dispatchInterval: 0,
    metaDataPluginsToLoad: [],
    enableXRay: true,
    eventPluginsToLoad: [new XhrPlugin(config)],
    telemetries: [],
    clientBuilder: showRequestClientBuilder
});
window.cwr('setAwsCredentials', {
    accessKeyId: 'a',
    secretAccessKey: 'b',
    sessionToken: 'c'
});
