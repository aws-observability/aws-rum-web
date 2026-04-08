import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';

const coreSrc = path.resolve(__dirname, '../../packages/core/src');

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        visualizer({
            filename: 'build/stats.html',
            open: true,
            gzipSize: true
        }),
        visualizer({
            filename: 'build/stats.json',
            template: 'raw-data',
            gzipSize: true
        })
    ],
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        alias: [
            {
                find: /^@aws-rum\/web-slim$/,
                replacement: path.resolve(
                    __dirname,
                    '../../packages/slim/src/index.ts'
                )
            },
            {
                find: /^@aws-rum\/web-core\/(.*)/,
                replacement: `${coreSrc}/$1`
            },
            {
                find: /^@aws-rum\/web-core$/,
                replacement: `${coreSrc}/index.ts`
            }
        ]
    },
    optimizeDeps: {
        exclude: ['@aws-rum/web-slim', '@aws-rum/web-core']
    }
});
