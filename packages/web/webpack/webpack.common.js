const path = require('path');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');

module.exports = {
    entry: path.resolve(__dirname, '../src/index-browser.ts'),
    target: ['web', 'es2017'],
    resolve: {
        extensions: ['.ts', '.js', '.json'],
        alias: {
            '@aws-rum/web-core': path.resolve(__dirname, '../../core/src'),
            '@aws-rum/web-slim': path.resolve(__dirname, '../../slim/src'),
            // @rrweb/record is pre-bundled (377 KB) and not tree-shakable. Alias
            // to rrweb's ESM source so webpack can tree-shake unused rrweb
            // subsystems out of the CDN bundle. NPM consumers bypass this
            // alias and get @rrweb/record directly (which fixes the CJS
            // `exports is not defined` bug from rrweb's broken package.json).
            '@rrweb/record$': 'rrweb/es/rrweb/packages/rrweb/src/index.js'
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
