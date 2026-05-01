import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 5220;

// Fallback for config.local.js before cdk deploy / write-configs. Returns
// a stub so pages load without 404s — the snippet will warn and skip.
app.get('/config.local.js', (_req, res, next) => {
    const local = path.join(__dirname, 'public', 'config.local.js');
    res.sendFile(local, (err) => {
        if (err) {
            res.type('application/javascript').send(
                '// config.local.js not generated yet. Run:\n' +
                    '//   cd ../../Examples/infra && npm run deploy && npm run write-configs\n' +
                    'console.warn("[mpa-cdn-demo] config.local.js missing — RUM init will be skipped.");\n'
            );
        } else {
            next && next();
        }
    });
});

// Serve the demo pages. cwr.js / cwr-slim.js load from the published CDN
// at https://client.rum.us-east-1.amazonaws.com/3.0.0/ — no local mount.
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
    console.log(`mpa-cdn-demo listening at http://localhost:${PORT}`);
    console.log(
        '  cwr.js / cwr-slim.js load from https://client.rum.us-east-1.amazonaws.com/3.0.0/'
    );
});
