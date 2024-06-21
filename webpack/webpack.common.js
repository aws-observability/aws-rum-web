const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');

const babelLoaderOptions = {
    presets: [
        [
            '@babel/preset-env',
            {
                targets: {
                    edge: '17',
                    firefox: '60',
                    chrome: '67',
                    safari: '11.1'
                }
                // useBuiltIns: 'usage',
                // corejs: '3.6.5'
            }
        ]
    ]
};

module.exports = {
    entry: './src/index-browser.ts',
    target: ['web', 'es5'],
    resolve: {
        extensions: ['.ts', '.js', '.json']
    },
    plugins: [new CaseSensitivePathsPlugin()],
    module: {
        rules: [
            {
                test: [/\.js$/],
                exclude: /node_modules\/(?!@aws-sdk)/,
                use: {
                    loader: 'babel-loader',
                    options: babelLoaderOptions
                }
            },
            {
                test: [/\.ts$/],
                exclude: /node_modules\/(?!@aws-sdk)/,
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
