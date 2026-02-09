const CopyWebpackPlugin = require('copy-webpack-plugin');
const common = require('./webpack.common');
const { merge } = require('webpack-merge');
const path = require('path');

const coreSrc = path.resolve(__dirname, '../../../packages/core/src');

module.exports = merge(common, {
    mode: 'development',
    devtool: 'inline-source-map',
    entry: {
        rum_javascript_telemetry: path.join(coreSrc, 'index-browser.ts'),
        loader_standard: path.join(coreSrc, 'loader/loader-standard.js'),
        loader_page_event: path.join(coreSrc, 'loader/loader-page-event.js'),
        loader_navigation_event: path.join(coreSrc, 'loader/loader-navigation-event.js'),
        loader_resource_event: path.join(coreSrc, 'loader/loader-resource-event.js'),
        loader_dom_event: path.join(coreSrc, 'loader/loader-dom-event.js'),
        loader_dom_event_mutation_observer_enabled:
            path.join(coreSrc, 'loader/loader-dom-event-mutation-observer-enabled.js'),
        loader_ingestion: path.join(coreSrc, 'loader/loader-ingestion.js'),
        loader_js_error_event: path.join(coreSrc, 'loader/loader-js-error-event.js'),
        loader_http_fetch_event: path.join(coreSrc, 'loader/loader-http-fetch-event.js'),
        loader_http_xhr_event: path.join(coreSrc, 'loader/loader-http-xhr-event.js'),
        loader_web_vital_event: path.join(coreSrc, 'loader/loader-web-vital-event.js'),
        loader_time_to_interactive_event:
            path.join(coreSrc, 'loader/loader-time-to-interactive-event.js'),
        loader_cookies_enabled: path.join(coreSrc, 'loader/loader-cookies-enabled.js'),
        loader_cookies_disabled: path.join(coreSrc, 'loader/loader-cookies-disabled.js'),
        loader_pre_load_command_queue_test:
            path.join(coreSrc, 'loader/loader-pre-load-command-queue-test.js'),
        loader_post_load_command_queue_test:
            path.join(coreSrc, 'loader/loader-post-load-command-queue-test.js'),
        loader_remote_config: path.join(coreSrc, 'loader/loader-remote-config.js'),
        loader_spa: path.join(coreSrc, 'loader/loader-spa.js'),
        loader_custom_events: path.join(coreSrc, 'loader/loader-custom-events.js'),
        loader_alias: path.join(coreSrc, 'loader/loader-alias.js'),
        loader_custom_headers: path.join(coreSrc, 'loader/loader-custom-headers.js'),
        loader_w3c_format_enabled: path.join(coreSrc, 'loader/loader-w3c-format-enabled.js'),
        loader_compression: path.join(coreSrc, 'loader/loader-compression.js'),
        loader_compression_disabled:
            path.join(coreSrc, 'loader/loader-compression-disabled.js'),
        loader_session_replay: path.join(coreSrc, 'loader/loader-session-replay.js')
    },
    resolve: {
        extensions: ['.ts', '.js', '.json']
    },
    output: {
        path: path.join(__dirname, '../build/dev'),
        filename: '[name].js',
        publicPath: ''
    },
    devServer: {
        static: path.join(__dirname, '../build/dev'),
        port: 9000,
        server: 'http',
        hot: true
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [{ from: path.resolve(__dirname, '../../../app') }]
        })
    ]
});
