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
