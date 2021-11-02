import { loader } from './loader';
import { showIntegRequestClientBuilder } from '../test-utils/integ-http-handler';
import { JsErrorPlugin } from '../plugins/event-plugins/JsErrorPlugin';
loader(
    'cwr',
    '[applicationId]',
    '1.0',
    'us-west-2',
    './rum_javascript_telemetry.js',
    {
        allowCookies: true,
        clientBuilder: showIntegRequestClientBuilder,
        dispatchInterval: 0,
        endpoint: '[endpoint]',
        guestRoleArn: '[guestRoleArn]',
        identityPoolId: '[identityPoolId]',
        metaDataPluginsToLoad: [],
        eventPluginsToLoad: [new JsErrorPlugin()],
        sessionSampleRate: 1,
        telemetries: []
    }
);
