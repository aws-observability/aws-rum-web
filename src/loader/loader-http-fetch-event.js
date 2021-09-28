import { loader } from './loader';
import { showRequestClientBuilder } from '../test-utils/mock-http-handler';
import { FetchPlugin } from '../plugins/event-plugins/FetchPlugin';
import { defaultConfig } from '../plugins/utils/http-utils';

const config = {
    ...defaultConfig,
    ...{
        logicalServiceName: 'sample.rum.aws.amazon.com',
        trace: true,
        recordAllRequests: true
    }
};

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
        eventPluginsToLoad: [new FetchPlugin(config)],
        telemetries: [],
        clientBuilder: showRequestClientBuilder
    }
);
window.cwr('setAwsCredentials', {
    accessKeyId: 'a',
    secretAccessKey: 'b',
    sessionToken: 'c'
});
