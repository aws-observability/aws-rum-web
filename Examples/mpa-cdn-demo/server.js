import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 5220;

// Serve the built CDN bundle (cwr.js) from the monorepo so the snippet
// can load it the way it would load from the real CloudWatch RUM CDN.
const cdnBundlePath = path.resolve(
    __dirname,
    '../../packages/web/build/assets'
);
app.use('/cdn', express.static(cdnBundlePath));

// Serve the demo pages.
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
    console.log(`mpa-cdn-demo listening at http://localhost:${PORT}`);
    console.log(`  cwr.js available at http://localhost:${PORT}/cdn/cwr.js`);
    console.log(
        '  ensure aws-rum-web-ui is running (server on :3000, UI on :5200)'
    );
});
