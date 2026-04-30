// CloudWatch RUM embedded snippet — shared across all pages of this MPA.
// Each hard navigation loads a fresh copy of this script, which bootstraps
// the web client and keeps the same session via the cwr_s cookie.
//
// In production the 5th argument points at the real CDN, e.g.
//   'https://client.rum.us-east-1.amazonaws.com/3.x/cwr.js'
// This demo serves a locally built copy at /cdn/cwr.js from
// packages/web/build/assets/cwr.js (run `npm run build` in
// packages/web first).
(function (n, i, v, r, s, c, u, x, z) {
    x = window.AwsRumClient = {
        q: [],
        n: n,
        i: i,
        v: v,
        r: r,
        c: c,
        u: u
    };
    window[n] = function (c, p) {
        x.q.push({ c: c, p: p });
    };
    z = document.createElement('script');
    z.async = true;
    z.src = s;
    document.head.insertBefore(z, document.getElementsByTagName('script')[0]);
})(
    'cwr',
    'c6850c37-b146-4409-b8a9-8d40182ccd4c',
    '1.0.0',
    'us-east-1',
    '/cdn/cwr.js',
    {
        sessionSampleRate: 1,
        identityPoolId: 'us-east-1:295d05fe-a1cb-4ea1-93e0-9c9a7b8460f0',
        endpoint: 'https://dataplane.rum.us-east-1.amazonaws.com',
        telemetries: [
            'errors',
            'performance',
            ['http', { addXRayTraceIdHeader: true }],
            'replay'
        ],
        allowCookies: true,
        enableXRay: true,
        debug: true
    }
);
