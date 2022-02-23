# Amazon CloudWatch RUM Web Client

This is the CloudWatch RUM web client source code repository. It hosts a
JavaScript library which performs real user monitoring (RUM) telemetry on web
applications. Data collected by the RUM web client includes page load timing,
JavaScript errors and HTTP requests.

## Installing

The latest stable version of the web client is hosted on a content delivery
network (CDN) hosted by CloudWatch RUM. See the [CloudWatch RUM
documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-RUM.html)
for instructions on how to create an AppMonitor and generate a code snippet
which will install the web client in your application.

## Documentation

1. [Installing from CDN](docs/cdn_installation.md)
1. [Executing Commands](docs/cdn_commands.md)
1. [Using the Web Client with Angular](docs/cdn_angular.md)
1. [Using the Web Client with React](docs/cdn_react.md)
1. [Troubleshooting CDN Installations](docs/cdn_troubleshooting.md)

## Getting Help

Use the following community resources for getting help with the SDK. We use the GitHub issues for tracking bugs and feature requests.

-   View the [CloudWatch RUM documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-RUM.html).
-   Open a support ticket with [AWS Support](https://docs.aws.amazon.com/awssupport/latest/user/getting-started.html).
-   If you think you may have found a bug, open an [issue](https://github.com/aws-observability/aws-rum-web/issues/new).

## Opening Issues

If you encounter a bug with the CloudWatch RUM web client, we want to hear
about it. Before opening a new issue, search the existing issues to see if
others are also experiencing the issue. Include the version of the CloudWatch
RUM Web Client, Node.js runtime, and other dependencies if applicable. In
addition, include the repro case when appropriate.

The GitHub issues are intended for bug reports and feature requests. For help
and questions about using the CloudWatch RUM Web Client, use the resources
listed in the Getting Help section. Keeping the list of open issues lean helps
us respond in a timely manner.

## Contributing

We support and accept PRs from the community.

See [CONTRIBUTING](./CONTRIBUTING.md)

## Build from Source

The CloudWatch RUM web client is developed and built using Node.js version 16 or higher.

To build the CloudWatch RUM web client, run the release process:

```
npm install
npm run release
```

The release process creates (1) a web bundle and a debug map for distribution via CDN, and (2) JavaScript modules and TypeScript declaration files for distribution via NPM.

The CDN files are:

```
./build/assets/cwr.js
./build/assets/cwr.map.js
```

The NPM files are:

```
./dist/es/index.js
./dist/es/index.d.ts
./dist/cjs/index.js
./dist/cjs/index.d.ts
```

## Run Tests from Source

To perform exploratory testing, run the Webpack DevServer:

```
npm install
npm run server
```

In a browser, navigate to http://localhost:9000.

To run (Jest) unit tests:

```
npm run test
```

To run (TestCafe) browser integration tests:

```
npm run integ:local:chrome:headless
```

Some features perform monkey patching which is incompatible with TestCafe. In
these cases, run Nightwatch as a separate browser integration test target:

```
npm run integ:local:nightwatch
```

## Pre-commit Tasks

The RUM Web Client uses pre-commit tasks to lint and format its source code.
Before submitting code, check that all linter and formatter warnings have been
resolved.

Attempt to automatically repair linter warnings:

```
npm run lint:fix
```

Format code:

```
npm run prettier:fix
```

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more
information.

## License

This project is licensed under the Apache-2.0 License.
