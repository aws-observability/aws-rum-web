import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { visualizer } from 'rollup-plugin-visualizer';

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
    server: {
        port: 5210,
        strictPort: true
    }
});
