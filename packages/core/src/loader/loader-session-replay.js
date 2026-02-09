import { loader } from './loader';
import { showRequestClientBuilder } from '../test-utils/mock-http-handler';
import { RRWebPlugin } from '../plugins/event-plugins/RRWebPlugin';
loader('cwr', 'abc123', '1.0', 'us-west-2', './rum_javascript_telemetry.js', {
    allowCookies: true,
    dispatchInterval: 0,
    metaDataPluginsToLoad: [],
    eventPluginsToLoad: [
        new RRWebPlugin({
            batchSize: 3,
            flushInterval: 2000,
            recordOptions: {
                slimDOMOptions: 'all',
                inlineStylesheet: true,
                inlineImages: false,
                collectFonts: true,
                recordCrossOriginIframes: false,
                maskAllInputs: true,
                maskTextSelector: '*'
            }
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
