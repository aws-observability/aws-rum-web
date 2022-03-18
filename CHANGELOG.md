# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## 1.5.0-alpha.0 (2022-03-18)


### Features
* Capture SPA route change timing ([#124](https://github.com/aws-observability/aws-rum-web/issues/124)) ([263978a](https://github.com/aws-observability/aws-rum-web/commit/263978a9bf9074d3952842de3a822f8ad33224ea))


## [1.3.0](https://github.com/aws-observability/aws-rum-web/compare/v1.2.1...v1.3.0) (2022-03-08)


### Features

* Add registerDomEvents command ([#111](https://github.com/aws-observability/aws-rum-web/issues/111)) ([2a67daa](https://github.com/aws-observability/aws-rum-web/commit/2a67daafd889a6eda6186c38d3d930eba816d13c))
* Dynamically update DOM event listeners ([#112](https://github.com/aws-observability/aws-rum-web/issues/112)) ([d4bfbb5](https://github.com/aws-observability/aws-rum-web/commit/d4bfbb5733e749bad5e6a2590f3d3fb2f43032c5))

### 1.2.1 (2022-02-25)


### Bug Fixes

* Use PerformanceObserver to act as a second check to prevent returning 0 for duration and loadEventEnd ([#101](https://github.com/aws-observability/aws-rum-web/issues/101)) ([cea2c0b](https://github.com/aws-observability/aws-rum-web/commit/cea2c0bdcccdf765c26419c129a858955bde68ee))

## 1.2.0 (2022-02-23)


### Features

* identify DOM events using CSS locator ([#87](https://github.com/aws-observability/aws-rum-web/issues/87)) ([1c911e0](https://github.com/aws-observability/aws-rum-web/commit/1c911e0bf14841567c8bffe8367fe4b5f4977c9f))


### Bug Fixes

* Point to correct license files in bundle banner. ([#91](https://github.com/aws-observability/aws-rum-web/issues/91)) ([1082f23](https://github.com/aws-observability/aws-rum-web/commit/1082f2308ca7cb3b4bf99c00ce6bf60d56a52b1c))
* Set aws api call xray subsegment namespace to aws ([#90](https://github.com/aws-observability/aws-rum-web/issues/90)) ([36d4e3c](https://github.com/aws-observability/aws-rum-web/commit/36d4e3c822df113c310af4d1c03301c484182651))
* Set x-amzn-trace-id header directly in request headers ([#93](https://github.com/aws-observability/aws-rum-web/issues/93)) ([706d93e](https://github.com/aws-observability/aws-rum-web/commit/706d93e84bd4ef1feb3e728d42c98be8cec10348))

## 1.1.0 (2022-02-10)

### Features

* Support cookie names unique to appmonitor. ([#82](https://github.com/aws-observability/aws-rum-web/issues/82)) ([143f6f0](https://github.com/aws-observability/aws-rum-web/commit/143f6f0a011500585e81896e9b4755c189a51053))

### Bug Fixes

* capture PerformanceNavigationTiming events even when window.load fires before plugin loads ([#81](https://github.com/aws-observability/aws-rum-web/issues/81)) ([ece1306](https://github.com/aws-observability/aws-rum-web/commit/ece1306d82f51453d4009701eed4051d91708810))
* change RUM origin from AWS::RUM::Application to AWS::RUM::AppMonitor ([#85](https://github.com/aws-observability/aws-rum-web/issues/85)) ([ead3b41](https://github.com/aws-observability/aws-rum-web/commit/ead3b410bc7421c83bcd963d370ade7cbfb39a4e))
* documentation typos ([#80](https://github.com/aws-observability/aws-rum-web/issues/80)) ([5492091](https://github.com/aws-observability/aws-rum-web/commit/549209115ac27d999820d5b6ff0c25586eb98ef3))

## 1.0.5

-   fix: add Cache-Control max-age to CDN files ([#76](https://github.com/aws-observability/aws-rum-web/issues/76)) ([fad8fb9](https://github.com/aws-observability/aws-rum-web/commit/fad8fb9cc39fbd11b5e58501468b0a1971cc4279))
-   fix: find the first script tag in head instead of the entire document ([#72](https://github.com/aws-observability/aws-rum-web/issues/72)) ([dc86ec6](https://github.com/aws-observability/aws-rum-web/commit/dc86ec609c5dadb975508faab0ce721147dca7e3))
-   fix: Uncaught TypeError: Cannot read the properties of undefined (reading 'record') ([#75](https://github.com/aws-observability/aws-rum-web/issues/75)) ([0193480](https://github.com/aws-observability/aws-rum-web/commit/019348075d0c0aadf618f18eb89e09d827351bd5))

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