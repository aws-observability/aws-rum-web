export function loader(
    namespace,
    applicationId,
    applicationVersion,
    region,
    clientUri,
    config,
    remoteConfigUri
) {
    (function (n, i, v, r, s, c, u, x, z) {
        // The global object that the AWS RUM client will use to read configuration and commands.
        x = window.AwsRumClient = {
            q: [],
            n: n,
            i: i,
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
            document.head.getElementsByTagName('script')[0]
        );
    })(
        namespace,
        applicationId,
        applicationVersion,
        region,
        clientUri,
        config,
        remoteConfigUri
    );
}
