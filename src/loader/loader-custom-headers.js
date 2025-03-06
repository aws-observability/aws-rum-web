import { loader } from './loader';
import { showRequestClientBuilder } from '../test-utils/mock-http-custom-headers';

const token =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
loader(
    'cwr',
    'a1b2c3d4-c3f5-1a2b-b2b4-012345678910',
    '1.0',
    'us-west-2',
    './rum_javascript_telemetry.js',
    {
        userIdRetentionDays: 1,
        dispatchInterval: 0,
        allowCookies: false,
        eventPluginsToLoad: [],
        telemetries: [],
        clientBuilder: showRequestClientBuilder,
        signing: false,
        endpoint:
            'https://api-id.execute-api.region.amazonaws.com/api/dataplane',
        headers: {
            Authorization: `Bearer ${token}`,
            'x-api-key': 'a1b2c3d4e5f6',
            'content-type': 'application/json'
        }
    }
);
