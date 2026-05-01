#!/usr/bin/env node
// Drives the full 8-scenario RUM test matrix end-to-end:
//   (auth | noauth) x (npm | cdn) x (full | slim)
//
// For each scenario, opens a FRESH browser context (no shared cookies or
// localStorage), loads the demo URL, waits for the first PutRumEvents POST
// to the expected appmonitor, and records the status.
//
// Fresh contexts are essential: cwr_s (session cookie) and cwr_u (user id
// cookie) are shared across :5210 / :5220 and across scenarios, so without
// isolation all runs look like a continuation of the first session in the
// RUM console — no new sessionStart event, wrong scenario attribution.
//
// Usage:
//   # Prereqs:
//   #   - SPA running at http://localhost:5210 (Examples/spa-react-demo: npm run dev)
//   #   - MPA running at http://localhost:5220 (Examples/mpa-cdn-demo: npm run dev)
//   #   - Cognito test user exists in the user pool (see spa-react-demo README)
//   #   - Playwright chromium installed (npx playwright install chromium)
//   #
//   node Examples/infra/scripts/validate-matrix.mjs \
//     --username=testuser --password='TestP@ssw0rd!'
//
// Exit code: 0 iff all 8 scenarios succeed.

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

// The event emitted exactly once when a new RUM session begins. Presence of
// this type in a PutRumEvents batch proves the browser started a fresh
// session rather than resuming one from the cwr_s cookie.
const SESSION_START_TYPE = 'com.amazon.rum.session_start_event';

// Parse a PutRumEvents request body and return the list of event type
// strings. Handles both dispatch paths:
//   - fetch path (full + slim signed): gzip'd JSON, {"RumEvents":[{type,...}]}
//   - sendBeacon path: text/plain base64'd JSON with same shape
function extractEventTypes(req) {
    const buf = req.postDataBuffer();
    if (!buf) return [];
    const tryParse = (raw) => {
        try {
            const json = JSON.parse(raw);
            const events = json.RumEvents || json.rumEvents || [];
            return events.map((e) => e.type).filter(Boolean);
        } catch {
            return null;
        }
    };
    // gzip?
    if (buf[0] === 0x1f && buf[1] === 0x8b) {
        try {
            return tryParse(gunzipSync(buf).toString('utf8')) || [];
        } catch {
            /* fall through */
        }
    }
    // plain text
    const direct = tryParse(buf.toString('utf8'));
    if (direct) return direct;
    // base64 (beacon path sometimes)
    try {
        return tryParse(Buffer.from(buf.toString('utf8'), 'base64').toString('utf8')) || [];
    } catch {
        return [];
    }
}

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
        const [k, ...v] = a.replace(/^--/, '').split('=');
        return [k, v.join('=') || true];
    })
);

const USERNAME = args.username || 'testuser';
const PASSWORD = args.password || 'TestP@ssw0rd!';
const OUT = args.out || resolve(__dirname, '../../../validate-matrix-results.json');
const HEADLESS = args.headless !== 'false';

// Load config to resolve appMonitorId per scenario.
const CONFIG_PATH = resolve(
    __dirname,
    '../../spa-react-demo/public/config.local.js'
);
const configSrc = readFileSync(CONFIG_PATH, 'utf8');
const cfg = (() => {
    const g = {};
    new Function('window', configSrc).call({}, g);
    return g.__RUM_CONFIG__;
})();

const SCENARIOS = [
    { key: 'noauth-npm-full', port: 5210, path: '/?scenario=noauth-npm-full' },
    { key: 'noauth-npm-slim', port: 5210, path: '/?scenario=noauth-npm-slim' },
    { key: 'noauth-cdn-full', port: 5220, path: '/?scenario=noauth-cdn-full' },
    { key: 'noauth-cdn-slim', port: 5220, path: '/?scenario=noauth-cdn-slim' },
    { key: 'auth-npm-full', port: 5210, path: '/?scenario=auth-npm-full', auth: true },
    { key: 'auth-npm-slim', port: 5210, path: '/?scenario=auth-npm-slim', auth: true },
    { key: 'auth-cdn-full', port: 5220, path: '/?scenario=auth-cdn-full', auth: true },
    { key: 'auth-cdn-slim', port: 5220, path: '/?scenario=auth-cdn-slim', auth: true }
];

// How long to wait for the first PutRumEvents POST after navigation.
const DISPATCH_TIMEOUT_MS = 15_000;
// How long to wait after first POST to catch sessionStart / additional events.
const TAIL_MS = 3_000;

async function runOne(browser, scenario) {
    const { key, port, path, auth } = scenario;
    const monitorId = cfg.scenarios[key].appMonitorId;
    const url = `http://localhost:${port}${path}`;
    const putRumUrlRe = new RegExp(
        `dataplane\\.rum\\.[^/]+/appmonitors/${monitorId}`
    );

    // Fresh context — no cookies, no localStorage, no cache, no shared session.
    const context = await browser.newContext();
    // Pre-seed localStorage for auth-* scenarios BEFORE any page loads so
    // rum.ts can read it synchronously.
    if (auth) {
        await context.addInitScript(
            ({ u, p }) => {
                try {
                    localStorage.setItem('rumExUsername', u);
                    localStorage.setItem('rumExPassword', p);
                } catch {
                    /* origin access errors are fine pre-nav */
                }
            },
            { u: USERNAME, p: PASSWORD }
        );
    }

    const page = await context.newPage();
    const posts = [];
    page.on('requestfinished', async (req) => {
        const u = req.url();
        if (putRumUrlRe.test(u)) {
            const resp = await req.response();
            // Signing can be: header (fetch path — Authorization: AWS4-HMAC-SHA256),
            // query (sendBeacon presigned — X-Amz-Signature in URL), or unsigned
            // (slim + resource-based policy).
            const headers = req.headers();
            const queryPresigned = u.includes('X-Amz-Signature');
            const headerSigned = /AWS4-HMAC-SHA256/.test(
                headers.authorization || ''
            );
            const eventTypes = extractEventTypes(req);
            posts.push({
                url: u,
                method: req.method(),
                status: resp?.status(),
                signing: queryPresigned
                    ? 'query-presigned'
                    : headerSigned
                      ? 'header-sigv4'
                      : 'unsigned',
                eventTypes,
                hasSessionStart: eventTypes.includes(SESSION_START_TYPE)
            });
        }
    });

    const consoleLogs = [];
    page.on('console', (msg) => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));

    let error;
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        // Wait for the first matching POST or timeout.
        const deadline = Date.now() + DISPATCH_TIMEOUT_MS;
        while (posts.length === 0 && Date.now() < deadline) {
            await page.waitForTimeout(250);
        }
        await page.waitForTimeout(TAIL_MS);
    } catch (e) {
        error = e.message;
    }

    // Extract session id for attribution evidence.
    const cookies = await context.cookies();
    const sessionCookie = cookies.find((c) => c.name === 'cwr_s');
    let sessionId;
    if (sessionCookie) {
        try {
            sessionId = JSON.parse(decodeURIComponent(sessionCookie.value)).sessionId;
        } catch {
            sessionId = sessionCookie.value;
        }
    }

    await context.close();

    const sawSessionStart = posts.some((p) => p.hasSessionStart);
    // Require 200 AND a sessionStart event — otherwise the "success" is just
    // an existing session continuing, which means cookie isolation failed.
    const success = posts.some((p) => p.status === 200) && sawSessionStart;
    return {
        key,
        monitorId,
        success,
        sawSessionStart,
        posts,
        sessionId,
        initLog: consoleLogs.find((l) => l.includes('initialized')) || null,
        error
    };
}

async function main() {
    const browser = await chromium.launch({ headless: HEADLESS });
    const results = [];
    try {
        for (const sc of SCENARIOS) {
            process.stdout.write(`[${sc.key}] running… `);
            const r = await runOne(browser, sc);
            results.push(r);
            const firstOk = r.posts.find((p) => p.status === 200);
            const reason = !firstOk
                ? `no 200 POST to ${r.monitorId}${r.error ? ` (${r.error})` : ''}`
                : !r.sawSessionStart
                  ? `200 POST present but no session_start_event — session isolation failed`
                  : '';
            console.log(
                r.success
                    ? `✅ ${firstOk.status} (${firstOk.signing}) sessionStart=yes session=${r.sessionId ?? '?'}`
                    : `❌ ${reason}`
            );
        }
    } finally {
        await browser.close();
    }

    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
    console.log(`\nResults written: ${OUT}`);

    const failed = results.filter((r) => !r.success);
    if (failed.length) {
        console.error(`\n${failed.length}/${results.length} scenarios failed`);
        process.exit(1);
    }
    console.log(`\nAll ${results.length}/${results.length} scenarios ✅`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
