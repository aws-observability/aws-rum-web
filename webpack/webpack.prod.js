const path = require('path');
const merge = require('webpack-merge');
const common = require('./webpack.common');
const LicensePlugin = require('webpack-license-plugin');

const babelLoaderOptions = {
    presets: [
        [
            '@babel/preset-env',
            {
                targets: {
                    browsers: [
                        'last 3 chrome versions',
                        'last 3 firefox versions',
                        'ie 11',
                        'last 3 edge versions',
                        'last 3 safari versions'
                    ]
                }
            }
        ]
    ]
};

module.exports = merge(common, {
    plugins: [new LicensePlugin()],
    mode: 'production',
    devtool: 'nosources-source-map',
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
    },
    module: {
        rules: [
            {
                test: [/.js$/],
                use: {
                    loader: 'babel-loader',
                    options: babelLoaderOptions
                }
            },
            {
                test: [/\.ts$/],
                use: [
                    {
                        loader: 'babel-loader',
                        options: babelLoaderOptions
                    },
                    {
                        loader: 'ts-loader',
                        options: {
                            configFile: 'tsconfig.webpack.json'
                        }
                    }
                ]
            }
        ]
    }
});
