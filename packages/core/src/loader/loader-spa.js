import { loader } from '../loader/loader';
import { showRequestClientBuilder } from '../test-utils/mock-http-handler';
loader('cwr', 'abc123', '1.0', 'us-west-2', './rum_javascript_telemetry.js', {
    allowCookies: true,
    dispatchInterval: 0,
    disableAutoPageView: false,
    pagesToExclude: [/\/page_view_do_not_record/],
    telemetries: ['performance'],
    pageIdFormat: 'PATH_AND_HASH',
    clientBuilder: showRequestClientBuilder,
    routeChangeTimeout: 1000
});
window.cwr('setAwsCredentials', {
    accessKeyId: 'a',
    secretAccessKey: 'b',
    sessionToken: 'c'
});
