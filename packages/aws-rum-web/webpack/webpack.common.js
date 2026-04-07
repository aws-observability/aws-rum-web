const path = require('path');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');

module.exports = {
    entry: path.resolve(__dirname, '../src/index-browser.ts'),
    target: ['web', 'es2017'],
    resolve: {
        extensions: ['.ts', '.js', '.json'],
        alias: {
            '@aws-rum-web/core': path.resolve(__dirname, '../../core/src'),
            '@aws-rum-web/slim': path.resolve(
                __dirname,
                '../../aws-rum-slim/src'
            )
        }
    },
    plugins: [new CaseSensitivePathsPlugin()],
    module: {
        rules: [
            {
                test: [/\.ts$/],
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            configFile: path.resolve(
                                __dirname,
                                'tsconfig.webpack.json'
                            )
                        }
                    }
                ]
            }
        ]
    }
};
