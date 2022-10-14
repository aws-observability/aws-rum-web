# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.10.0](https://github.com/aws-observability/aws-rum-web/compare/v1.8.1...v1.10.0) (2022-10-14)


### Features

* Custom attributes ([#254](https://github.com/aws-observability/aws-rum-web/issues/254)) ([3712926](https://github.com/aws-observability/aws-rum-web/commit/371292638adcd788fd81f05baff66812fac2e9b2))


### Bug Fixes


## [1.9.0](https://github.com/aws-observability/aws-rum-web/compare/v1.7.0...v1.9.0) (2022-10-04)


### Features

* Add useBeacon config for visibilitychange dispatch behavior. ([#194](https://github.com/aws-observability/aws-rum-web/issues/194)) ([00ef55f](https://github.com/aws-observability/aws-rum-web/commit/00ef55fe9af8c1a23d1689035a413341de6bd80e))

### Bug Fixes

* Fix MonkeyPatch type arg. ([#222](https://github.com/aws-observability/aws-rum-web/pull/222)) ([2cbbfa8](https://github.com/aws-observability/aws-rum-web/commit/2cbbfa8942b75990f3cf85782a38a6ae3c07b2f4))
* Remove error flag from x-ray trace root. ([#211](https://github.com/aws-observability/aws-rum-web/issues/211)) ([b71aaa9](https://github.com/aws-observability/aws-rum-web/commit/b71aaa9e5d34fc12ac81f0edf2cdc1de375698a0))


### [1.8.1](https://github.com/aws-observability/aws-rum-web/compare/v1.5.1...v1.8.1) (2022-08-04)


### Bug Fixes

* Set appropriate error codes in X-Ray segments ([#192](https://github.com/aws-observability/aws-rum-web/issues/192)) ([cc5bb43](https://github.com/aws-observability/aws-rum-web/commit/cc5bb43f974d952af77f8132a1d97c772d319f9c))

## [1.8.0](https://github.com/aws-observability/aws-rum-web/compare/v1.7.0...v1.8.0) (2022-08-04)


### Features

* Add URL to http events and trace segments. ([#190](https://github.com/aws-observability/aws-rum-web/issues/190)) ([fb1f758](https://github.com/aws-observability/aws-rum-web/commit/fb1f7586c1d9f983de3d2c515ce9a0e62c02e632))


## [1.7.0](https://github.com/aws-observability/aws-rum-web/compare/v1.6.0...v1.7.0) (2022-07-19)


### Features

* Add interaction Id to DOM event plugin ([#163](https://github.com/aws-observability/aws-rum-web/issues/163)) ([ee8f548](https://github.com/aws-observability/aws-rum-web/pull/163/commits/ee8f54872155d29014996659f579dde7e8fb0ff7))


### Bug Fixes


## [1.6.0](https://github.com/aws-observability/aws-rum-web/compare/v1.5.1...v1.6.0) (2022-06-09)


### Features

* Ignore errors ([#164](https://github.com/aws-observability/aws-rum-web/issues/164)) ([75dee61](https://github.com/aws-observability/aws-rum-web/commit/75dee618b95f2454f95ab50a43839feba98993b4))
* Retry fetch requests and disable dispatch on failure. ([#174](https://github.com/aws-observability/aws-rum-web/issues/174)) ([587929c](https://github.com/aws-observability/aws-rum-web/commit/587929c2b801e3a01e2a79d78d1fc41bc0133722))
* Use data plane endpoint path prefix. ([#156](https://github.com/aws-observability/aws-rum-web/issues/156)) ([3dd112f](https://github.com/aws-observability/aws-rum-web/commit/3dd112fe8bce2994147f7c1f11cc44978c632ad3))


### Bug Fixes

* Export types used in config object ([#154](https://github.com/aws-observability/aws-rum-web/issues/154)) ([9d4238b](https://github.com/aws-observability/aws-rum-web/commit/9d4238bc03a309e2dcacc997393b15d9cfe2752e))
* Remove duplicate PageIdFormat type in orchestration ([#162](https://github.com/aws-observability/aws-rum-web/issues/162)) ([6cec9da](https://github.com/aws-observability/aws-rum-web/commit/6cec9da3b6308bcec4f6e2adc613824401549625))

### [1.5.1](https://github.com/aws-observability/aws-rum-web/compare/v1.5.0...v1.5.1) (2022-05-13)


### Bug Fixes

* Fix route change timing fetch counter decrement ([#145](https://github.com/aws-observability/aws-rum-web/issues/145)) ([c4414d9](https://github.com/aws-observability/aws-rum-web/commit/c4414d9f9e97661b59414433864cf2fbfc602874))

## [1.5.0](https://github.com/aws-observability/aws-rum-web/compare/v1.2.1...v1.5.0) (2022-04-15)


### Features

* Capture SPA route change timing ([#134](https://github.com/aws-observability/aws-rum-web/issues/134)) ([91e1303](https://github.com/aws-observability/aws-rum-web/commit/91e13034ab1682ec621970bd9b76e693ea928da3))


## [1.4.0](https://github.com/aws-observability/aws-rum-web/compare/v1.2.1...v1.4.0) (2022-03-30)


### Features

* Page tagging ([#114](https://github.com/aws-observability/aws-rum-web/issues/114)) ([cb9cb13](https://github.com/aws-observability/aws-rum-web/commit/cb9cb1396a22b440ee7b62a0a02c30db54ff453f))


### Bug Fixes

* Add version property to http-event-schema ([#122](https://github.com/aws-observability/aws-rum-web/issues/122)) ([cf59ecb](https://github.com/aws-observability/aws-rum-web/commit/cf59ecb3e18e74e86eb5eccbcedcae8d20c1d83f))
* Make dynamic DOM event handlers configurable ([#129](https://github.com/aws-observability/aws-rum-web/issues/129)) ([49eecfc](https://github.com/aws-observability/aws-rum-web/commit/49eecfc40879913260c6d91781c392fbe5921dcc))
* Parse unhandledrejection error objects ([#123](https://github.com/aws-observability/aws-rum-web/issues/123)) ([f69c859](https://github.com/aws-observability/aws-rum-web/commit/f69c85919b8cc7f0f33418dc20455df4e4f42f9b))

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
