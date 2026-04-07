import { loader } from './loader';
import { showRequestClientBuilder } from '../test-utils/mock-http-handler';
loader('cwr', 'abc123', '1.0', 'us-west-2', './rum_javascript_telemetry.js', {
    dispatchInterval: 0,
    clientBuilder: showRequestClientBuilder
});
cwr('unsupported_command', {});
