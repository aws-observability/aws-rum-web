const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');

module.exports = {
    entry: './src/index-browser.ts',
    target: ['web', 'es2017'],
    resolve: {
        extensions: ['.ts', '.js', '.json']
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
                            configFile: 'tsconfig.webpack.json'
                        }
                    }
                ]
            }
        ]
    }
};
