import { loader } from './loader';
import { showRequestClientBuilder } from '../test-utils/mock-http-handler';
loader('cwr', 'abc123', '1.0', 'us-west-2', './rum_javascript_telemetry.js', {
    allowCookies: true,
    dispatchInterval: 0,
    metaDataPluginsToLoad: [],
    eventPluginsToLoad: [],
    telemetries: [
        [
            'replay',
            {
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
            }
        ]
    ],
    clientBuilder: showRequestClientBuilder
});
window.cwr('setAwsCredentials', {
    accessKeyId: 'a',
    secretAccessKey: 'b',
    sessionToken: 'c'
});
