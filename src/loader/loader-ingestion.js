import { loader } from './loader';
import { showIntegRequestClientBuilder } from '../test-utils/integ-http-handler';
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
        sessionSampleRate: 1,
        telemetries: [
            'performance',
            'errors',
            ['http', { addXRayTraceIdHeader: true }]
        ],
        enableXRay: true
    }
);
