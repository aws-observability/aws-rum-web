#!/usr/bin/env node
// Reads CFN outputs from the deployed RumExamples3xStack and writes
// config.local.js into each demo app's public/ directory so the browser
// apps know which AppMonitor to report to per scenario.
//
// Usage:
//   AWS_PROFILE=... node scripts/write-configs.js
//
// Prereqs: `cdk deploy` has succeeded and the stack outputs exist in the
// target account/region (defaults read from .env.local).

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const envPath = resolve(ROOT, '.env.local');
const env = Object.fromEntries(
    readFileSync(envPath, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((l) => l.split('='))
);
const REGION = env.RUM_EXAMPLES_REGION || 'us-west-1';
const STACK = 'RumExamples3xStack';

const outputs = JSON.parse(
    execSync(
        `aws cloudformation describe-stacks --stack-name ${STACK} --region ${REGION} --query "Stacks[0].Outputs" --output json`,
        { encoding: 'utf8' }
    )
);
const out = Object.fromEntries(
    outputs.map((o) => [o.OutputKey, o.OutputValue])
);

const SCENARIOS = [
    'noauth-npm-full',
    'noauth-npm-slim',
    'noauth-cdn-full',
    'noauth-cdn-slim',
    'auth-npm-full',
    'auth-npm-slim',
    'auth-cdn-full',
    'auth-cdn-slim'
];

const scenarios = Object.fromEntries(
    SCENARIOS.map((k) => [
        k,
        {
            appMonitorId:
                out[`AppMonitorId-${k}`.replace(/-/g, '')] ||
                out[`AppMonitorId${k.replace(/-/g, '')}`]
        }
    ])
);

const config = {
    region: REGION,
    endpoint: `https://dataplane.rum.${REGION}.amazonaws.com`,
    identityPoolId: out.IdentityPoolId,
    userPoolId: out.UserPoolId,
    userPoolClientId: out.UserPoolClientId,
    scenarios
};

const body = `window.__RUM_CONFIG__ = ${JSON.stringify(config, null, 2)};\n`;

for (const demo of ['spa-react-demo', 'mpa-cdn-demo']) {
    const target = resolve(ROOT, '..', demo, 'public', 'config.local.js');
    writeFileSync(target, body);
    console.log(`wrote ${target}`);
}
