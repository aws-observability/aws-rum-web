const CopyWebpackPlugin = require('copy-webpack-plugin');
const common = require('./webpack.common');
const { merge } = require('webpack-merge');
const path = require('path');

module.exports = merge(common, {
    mode: 'development',
    devtool: 'inline-source-map',
    entry: {
        rum_javascript_telemetry: './src/index-browser.ts',
        loader_standard: './src/loader/loader-standard.js',
        loader_page_event: './src/loader/loader-page-event.js',
        loader_dom_event: './src/loader/loader-dom-event.js',
        loader_dom_event_mutation_observer_enabled:
            './src/loader/loader-dom-event-mutation-observer-enabled.js',
        loader_ingestion: './src/loader/loader-ingestion.js',
        loader_js_error_event: './src/loader/loader-js-error-event.js',
        loader_http_fetch_event: './src/loader/loader-http-fetch-event.js',
        loader_http_xhr_event: './src/loader/loader-http-xhr-event.js',
        loader_web_vital_event: './src/loader/loader-web-vital-event.js',
        loader_cookies_enabled: './src/loader/loader-cookies-enabled.js',
        loader_cookies_disabled: './src/loader/loader-cookies-disabled.js',
        loader_pre_load_command_queue_test:
            './src/loader/loader-pre-load-command-queue-test.js',
        loader_post_load_command_queue_test:
            './src/loader/loader-post-load-command-queue-test.js',
        loader_remote_config: './src/loader/loader-remote-config.js',
        loader_spa: './src/loader/loader-spa.js'
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
        https: false,
        hot: true
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [{ from: 'app' }]
        })
    ]
});
