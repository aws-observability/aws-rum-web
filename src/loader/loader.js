export function loader(
    namespace,
    applicationId,
    applicationName,
    applicationVersion,
    region,
    clientUri,
    config,
    remoteConfigUri
) {
    (function (n, i, a, v, r, s, c, u, x, z) {
        // The global object that the AWS RUM client will use to read configuration and commands.
        x = window.AwsRumClient = {
            q: [],
            n: n,
            i: i,
            a: a,
            v: v,
            r: r,
            c: c,
            u: u
        };

        // The AWS RUM client's JavaScript API
        window[n] = function (c, p) {
            x.q.push({ c: c, p: p });
        };

        // Asynchronously load the script and ensure execution priority
        z = document.createElement('script');
        z.async = true;
        z.src = s;
        document.head.insertBefore(
            z,
            document.getElementsByTagName('script')[0]
        );
    })(
        namespace,
        applicationId,
        applicationName,
        applicationVersion,
        region,
        clientUri,
        config,
        remoteConfigUri
    );
}
