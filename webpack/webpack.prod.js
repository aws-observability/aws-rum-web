const path = require('path');
const { merge } = require('webpack-merge');
const common = require('./webpack.common');
const LicensePlugin = require('webpack-license-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = merge(common, {
    plugins: [new LicensePlugin()],
    mode: 'production',
    optimization: {
        minimizer: [
            new TerserPlugin({
                parallel: true,
                extractComments: true
            })
        ]
    },
    output: {
        path: path.join(__dirname, '../build/assets'),
        filename: 'cwr.js'
    }
});
