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
    '93755407-009b-4396-9280-0104beb732a9',
    '1.0.0',
    'us-east-1',
    '/cdn/cwr.js',
    {
        sessionSampleRate: 1,
        endpoint: 'http://localhost:3000',
        telemetries: ['errors', 'performance', 'http', 'replay'],
        allowCookies: true,
        signing: false,
        debug: true
    }
);
