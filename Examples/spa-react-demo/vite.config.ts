import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

const coreSrc = path.resolve(__dirname, '../../packages/core/src');

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        alias: [
            {
                find: /^aws-rum-slim$/,
                replacement: path.resolve(
                    __dirname,
                    '../../packages/aws-rum-slim/src/index.ts'
                )
            },
            {
                find: /^@aws-rum-web\/core\/(.*)/,
                replacement: `${coreSrc}/$1`
            },
            {
                find: /^@aws-rum-web\/core$/,
                replacement: `${coreSrc}/index.ts`
            }
        ]
    },
    optimizeDeps: {
        exclude: ['aws-rum-slim', '@aws-rum-web/core']
    }
});
