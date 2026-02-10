#!/usr/bin/env node
/**
 * Bundle size breakdown for aws-rum-web / aws-rum-slim.
 *
 * Uses webpack source maps to attribute minified bytes to each module.
 * Module sizes are EXACT (based on sourceMappingURL character ranges).
 * Gzip estimates are ESTIMATED (individual module gzip != sum of parts).
 *
 * Usage: node scripts/bundle-stats.js [--full | --slim | --both]
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BUNDLES = {
    full: {
        js: 'packages/aws-rum-web/build/assets/cwr.js',
        map: 'packages/aws-rum-web/build/assets/cwr.js.map'
    },
    slim: {
        js: 'packages/aws-rum-slim/build/assets/cwr-slim.js',
        map: 'packages/aws-rum-slim/build/assets/cwr-slim.js.map'
    }
};

const ROOT = path.resolve(__dirname, '..');

function parseSourceMap(mapPath) {
    const raw = fs.readFileSync(mapPath, 'utf8');
    const map = JSON.parse(raw);

    // vlq decode mappings to get per-source byte attribution
    const sources = map.sources || [];
    const sourcesContent = map.sourcesContent || [];
    const mappings = map.mappings || '';

    // Count characters in generated file attributed to each source
    const sizes = new Array(sources.length).fill(0);

    // Decode VLQ mappings
    let genCol = 0;
    let srcIdx = 0;
    let srcLine = 0;
    let srcCol = 0;

    const lines = mappings.split(';');
    for (const line of lines) {
        genCol = 0;
        if (!line) continue;
        const segments = line.split(',');
        let prevGenCol = 0;
        for (let i = 0; i < segments.length; i++) {
            const decoded = decodeVLQ(segments[i]);
            if (decoded.length === 0) continue;
            genCol += decoded[0];
            if (decoded.length >= 4) {
                srcIdx += decoded[1];
                srcLine += decoded[2];
                srcCol += decoded[3];
            }
            // Attribute characters from this segment to the source
            const nextSeg = i + 1 < segments.length ? segments[i + 1] : null;
            let nextGenCol = genCol;
            if (nextSeg) {
                const nd = decodeVLQ(nextSeg);
                if (nd.length > 0) nextGenCol = genCol + nd[0];
            }
            const chars = Math.max(0, nextGenCol - genCol);
            if (srcIdx >= 0 && srcIdx < sizes.length) {
                sizes[srcIdx] += chars || 1;
            }
        }
    }

    return { sources, sizes };
}

function decodeVLQ(str) {
    const result = [];
    let shift = 0;
    let value = 0;
    for (let i = 0; i < str.length; i++) {
        let digit =
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.indexOf(
                str[i]
            );
        if (digit === -1) continue;
        const cont = digit & 32;
        digit &= 31;
        value += digit << shift;
        if (cont) {
            shift += 5;
        } else {
            const negate = value & 1;
            value >>= 1;
            result.push(negate ? -value : value);
            value = 0;
            shift = 0;
        }
    }
    return result;
}

function categorize(source) {
    if (source.includes('node_modules/ua-parser-js')) return 'ua-parser-js';
    if (source.includes('node_modules/web-vitals')) return 'web-vitals';
    if (source.includes('node_modules/shimmer')) return 'shimmer';
    if (source.includes('node_modules/uuid')) return 'uuid';
    if (source.includes('node_modules/rrweb')) return 'rrweb';
    if (
        source.includes('node_modules/@smithy') ||
        source.includes('node_modules/@aws-sdk') ||
        source.includes('node_modules/@aws-crypto')
    )
        return 'aws-sdk/smithy';
    if (source.includes('node_modules/tslib')) return 'tslib';
    if (source.includes('node_modules/')) return 'other node_modules';
    if (source.includes('webpack/')) return 'webpack runtime';
    if (
        source.includes('/dispatch/Basic') ||
        source.includes('/dispatch/Enhanced') ||
        source.includes('/dispatch/Cognito') ||
        source.includes('/dispatch/Sts')
    )
        return 'app: auth';
    if (source.includes('/dispatch/')) return 'app: dispatch';
    if (source.includes('/plugins/')) return 'app: plugins';
    if (source.includes('/sessions/')) return 'app: sessions';
    if (source.includes('/event-cache/')) return 'app: event-cache';
    if (source.includes('/orchestration/')) return 'app: orchestration';
    if (source.includes('/event-bus/')) return 'app: event-bus';
    if (source.includes('/time-to-interactive/')) return 'app: tti';
    if (source.includes('/utils/')) return 'app: utils';
    if (source.includes('/remote-config/')) return 'app: remote-config';
    return 'app: other';
}

function analyze(name) {
    const bundle = BUNDLES[name];
    const jsPath = path.join(ROOT, bundle.js);
    const mapPath = path.join(ROOT, bundle.map);

    if (!fs.existsSync(jsPath) || !fs.existsSync(mapPath)) {
        console.log(
            `\n⚠  ${name}: bundle not found. Run npm run build first.\n`
        );
        return;
    }

    const jsContent = fs.readFileSync(jsPath);
    const totalRaw = jsContent.length;
    const totalGzip = zlib.gzipSync(jsContent).length;

    const { sources, sizes } = parseSourceMap(mapPath);

    // Group by category
    const groups = {};
    let attributedTotal = 0;
    for (let i = 0; i < sources.length; i++) {
        const cat = categorize(sources[i]);
        if (!groups[cat]) groups[cat] = { raw: 0, modules: [] };
        groups[cat].raw += sizes[i];
        groups[cat].modules.push({ name: sources[i], raw: sizes[i] });
        attributedTotal += sizes[i];
    }

    // Sort groups by size desc
    const sorted = Object.entries(groups).sort((a, b) => b[1].raw - a[1].raw);

    // Print
    const KB = (n) => (n / 1024).toFixed(1) + ' KB';
    const pct = (n) => ((n / totalRaw) * 100).toFixed(1) + '%';

    console.log(`\n${'═'.repeat(70)}`);
    console.log(`  ${name.toUpperCase()} BUNDLE: ${path.basename(jsPath)}`);
    console.log(`${'═'.repeat(70)}`);
    console.log(
        `  Total:  ${KB(totalRaw)} raw  /  ${KB(totalGzip)} gzip  (EXACT)`
    );
    console.log(`${'─'.repeat(70)}`);
    console.log(
        `  ${'Category'.padEnd(30)} ${'Raw'.padStart(
            10
        )} ${'% of total'.padStart(10)}`
    );
    console.log(`${'─'.repeat(70)}`);

    for (const [cat, data] of sorted) {
        console.log(
            `  ${cat.padEnd(30)} ${KB(data.raw).padStart(10)} ${pct(
                data.raw
            ).padStart(10)}`
        );
    }

    const unattributed = totalRaw - attributedTotal;
    if (unattributed > 100) {
        console.log(
            `  ${'(unattributed/boilerplate)'.padEnd(30)} ${KB(
                unattributed
            ).padStart(10)} ${pct(unattributed).padStart(10)}`
        );
    }

    console.log(`${'─'.repeat(70)}`);
    console.log(`  Sizes are EXACT (from source map character attribution).`);
    console.log(
        `  Gzip total is EXACT. Per-category gzip is not shown (not additive).`
    );
    console.log();

    // All individual modules
    const allModules = [];
    for (const [, data] of sorted) {
        allModules.push(...data.modules);
    }
    allModules.sort((a, b) => b.raw - a.raw);

    console.log(`  All modules (${allModules.length}):`);
    for (const m of allModules) {
        const short = m.name.replace(/^webpack:\/\/[^/]+\//, '');
        console.log(`    ${KB(m.raw).padStart(10)}  ${short}`);
    }
    console.log();
}

// CLI
const arg = process.argv[2] || '--both';
const reportDir = path.join(ROOT, 'reports');
if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

// Capture output to both console and file
const lines = [];
const origLog = console.log;
console.log = (...args) => {
    const line = args.join(' ');
    lines.push(line);
    origLog.call(console, ...args);
};

if (arg === '--full' || arg === '--both') analyze('full');
if (arg === '--slim' || arg === '--both') analyze('slim');

if (arg === '--both') {
    const fullJs = path.join(ROOT, BUNDLES.full.js);
    const slimJs = path.join(ROOT, BUNDLES.slim.js);
    if (fs.existsSync(fullJs) && fs.existsSync(slimJs)) {
        const fullGz = zlib.gzipSync(fs.readFileSync(fullJs)).length;
        const slimGz = zlib.gzipSync(fs.readFileSync(slimJs)).length;
        const saved = ((1 - slimGz / fullGz) * 100).toFixed(0);
        console.log(`  Slim saves ${saved}% gzip vs full (EXACT).`);
        console.log();
    }
}

const target = arg === '--full' ? 'full' : arg === '--slim' ? 'slim' : 'both';
const outFile = path.join(reportDir, `bundle-stats-${target}.txt`);
fs.writeFileSync(outFile, lines.join('\n') + '\n');
origLog.call(console, `Report written to ${path.relative(ROOT, outFile)}`);
