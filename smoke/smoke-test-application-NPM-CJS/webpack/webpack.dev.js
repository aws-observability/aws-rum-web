const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');

const babelLoaderOptions = {
    presets: [['@babel/preset-env', {}]],
    plugins: [
        [
            '@babel/plugin-transform-runtime',
            {
                absoluteRuntime: false,
                corejs: false,
                helpers: true,
                regenerator: true
            }
        ]
    ]
};

module.exports = {
    mode: 'development',
    devtool: 'inline-source-map',
    target: ['web', 'es5'],
    entry: {
        loader_npm_rum_tmp: './src/loader-npm-rum-tmp.ts',
        loader_npm_rum_tmp_2: './src/loader-npm-rum-tmp-2.ts',
        loader_npm_rum_w3c_format_enabled_tmp:
            './src/loader-npm-rum-w3c-format-enabled-tmp.ts'
    },
    resolve: {
        extensions: ['.ts', '.js', '.json'],
        mainFields: ['main', 'module', 'browser']
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [{ from: 'app' }]
        }),
        new CaseSensitivePathsPlugin()
    ],
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
    module: {
        rules: [
            {
                test: [/\.js$/],
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: babelLoaderOptions
                }
            },
            {
                test: [/\.ts$/],
                exclude: /node_modules/,
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
};
