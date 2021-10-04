import { loader } from './loader';
import { showRequestClientBuilder } from '../test-utils/mock-http-handler';
import { PageViewPlugin } from '../plugins/event-plugins/PageViewPlugin';
import { defaultConfig } from '../plugins/utils/http-utils';

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
        eventPluginsToLoad: [new PageViewPlugin(defaultConfig)],
        telemetries: [],
        pagesToInclude: [/\/(page_event.html|page_view_one|page_view_two)/],
        pagesToExclude: [/\/page_view_do_not_record/],
        clientBuilder: showRequestClientBuilder
    }
);
window.cwr('setAwsCredentials', {
    accessKeyId: 'a',
    secretAccessKey: 'b',
    sessionToken: 'c'
});
