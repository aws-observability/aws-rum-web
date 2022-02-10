# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## 1.1.0 (2022-02-10)

### Features

* Support cookie names unique to appmonitor. ([#82](https://github.com/aws-observability/aws-rum-web/issues/82)) ([143f6f0](https://github.com/aws-observability/aws-rum-web/commit/143f6f0a011500585e81896e9b4755c189a51053))

### Bug Fixes

* capture PerformanceNavigationTiming events even when window.load fires before plugin loads ([#81](https://github.com/aws-observability/aws-rum-web/issues/81)) ([ece1306](https://github.com/aws-observability/aws-rum-web/commit/ece1306d82f51453d4009701eed4051d91708810))
* change RUM origin from AWS::RUM::Application to AWS::RUM::AppMonitor ([#85](https://github.com/aws-observability/aws-rum-web/issues/85)) ([ead3b41](https://github.com/aws-observability/aws-rum-web/commit/ead3b410bc7421c83bcd963d370ade7cbfb39a4e))
* documentation typos ([#80](https://github.com/aws-observability/aws-rum-web/issues/80)) ([5492091](https://github.com/aws-observability/aws-rum-web/commit/549209115ac27d999820d5b6ff0c25586eb98ef3))

## 1.0.5

-   fix: Fixed uncaught TypeError when include/exclude URLs are used with tracing enabled

## 1.0.4

-   fix: Added npm prepublish script

## 1.0.3

-   fix: Fix X-Ray subsegment name when path is relative
-   fix: Fix unit test promise assertions
-   fix: Skip webvitals integ tests when browser is Firefox or Safari
-   improvement: Record uncaught promise rejection events

## 1.0.2

-   improvement: Added config option 'addXRayTraceIdHeader' for X-Amzn-Trace-Id header -- disabled by default
-   fix: Fixed missing X-Amzn-Trace-Id header when init argument is undefined
-   fix: Added transfer size and target URL fields back to resource event
-   fix: Removed source map from prod webpack bundle
-   improvement: Added a subsegment to trace segment to capture downstream request
-   improvement: Added config option 'enableXRay' to enable X-Ray tracing
-   fix: Removed default telemetries -- when no telemetries config is provided, none are instantiated
-   fix: Set user ID cookie expiry to 30 days

## 1.0.1

-   fix: Removed URL from event meta data

## 1.0.0

-   Initial release
