import { loader } from './loader';
import { showRequestClientBuilder } from '../test-utils/mock-http-handler';
import { JsEventPlugin } from '../plugins/event-plugins/JsEventPlugin';
loader('cwr', 'abc123', '1.0', 'us-west-2', './rum_javascript_telemetry.js', {
    allowCookies: true,
    dispatchInterval: 0,
    metaDataPluginsToLoad: [],
    eventPluginsToLoad: [
        new JsEventPlugin({
            ignore: (errorEvent) => {
                const patterns = [/ResizeObserver loop/];
                return (
                    patterns.filter((pattern) =>
                        pattern.test(errorEvent.message)
                    ).length !== 0
                );
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
