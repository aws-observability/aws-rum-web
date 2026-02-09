import { loader } from './loader';
import { showRequestClientBuilder } from '../test-utils/mock-http-handler';
loader('cwr', 'abc123', '1.0', 'us-west-2', './rum_javascript_telemetry.js', {
    userIdRetentionDays: 1,
    dispatchInterval: 0,
    allowCookies: false,
    eventPluginsToLoad: [],
    telemetries: [],
    clientBuilder: showRequestClientBuilder,
    signing: false,
    alias: 'test123'
});
