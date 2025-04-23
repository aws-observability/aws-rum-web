import { loader } from './loader';
import { showRequestClientBuilder } from '../test-utils/mock-http-handler';
import { WebVitalsPlugin } from '../plugins/event-plugins/WebVitalsPlugin';
import { NavigationPlugin } from '../plugins/event-plugins/NavigationPlugin';
import { ResourcePlugin } from '../plugins/event-plugins/ResourcePlugin';
loader('cwr', 'abc123', '1.0', 'us-west-2', './rum_javascript_telemetry.js', {
    dispatchInterval: 0,
    metaDataPluginsToLoad: [],
    eventPluginsToLoad: [
        new ResourcePlugin(),
        new NavigationPlugin(),
        new WebVitalsPlugin({
            reportAllCLS: true,
            reportAllINP: true
        })
    ],
    telemetries: [],
    clientBuilder: showRequestClientBuilder
});
window.cwr('setAwsCredentials', {
    accessKeyId: 'a',
    secretAccessKey: 'b',
    sessionToken: 'c'
});
