# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.24.0](https://github.com/aws-observability/aws-rum-web/compare/v1.23.0...v1.24.0) (2025-05-29)

### Bug Fixes

* add prerender offset to tti events ([#662](https://github.com/aws-observability/aws-rum-web/pull/662)) ([a6d2a3f](https://github.com/aws-observability/aws-rum-web/commit/a6d2a3f09c351286cb52ad6c1367a87b6d3abdf2))


## [1.23.0](https://github.com/aws-observability/aws-rum-web/compare/v1.22.0...v1.23.0) (2025-05-07)


### Features

* record INP ([#620](https://github.com/aws-observability/aws-rum-web/issues/620)) ([41347d3](https://github.com/aws-observability/aws-rum-web/commit/41347d3b66138748671b8cb3de189878fb7226e5))


### Bug Fixes

* Add quotes around message to fix npm deprecate command ([#652](https://github.com/aws-observability/aws-rum-web/issues/652)) ([8d8cf2f](https://github.com/aws-observability/aws-rum-web/commit/8d8cf2fca324abec0913c43769c9be0692d8dfb4))
* resolve off by one error in session expiration ([#647](https://github.com/aws-observability/aws-rum-web/issues/647)) ([a7a6fa2](https://github.com/aws-observability/aws-rum-web/commit/a7a6fa22f95afbf57e51251ede9a1631a3b9df59))

## [1.22.0](https://github.com/aws-observability/aws-rum-web/compare/release/1.21.x...release/1.22.x) (2025-03-27)


### Features

* fetch with keepalive ([#618](https://github.com/aws-observability/aws-rum-web/issues/618)) ([ade3e4d](https://github.com/aws-observability/aws-rum-web/commit/ade3e4d52cf993d0001c8c6a6766847dd79d47fe))
* custom headers ([#610](https://github.com/aws-observability/aws-rum-web/issues/610)) ([986fc17](https://github.com/aws-observability/aws-rum-web/commit/986fc17c08fd44aab0bee72eb88d939e0b25437c))


### Bug Fixes

* call sendBeacon synchronously ([#631](https://github.com/aws-observability/aws-rum-web/issues/631)) ([26aad1c](https://github.com/aws-observability/aws-rum-web/commit/26aad1c27db7237741dd58f3422e5f4b4c07c717))
* Use port from endpoint url to create HttpRequestOptions ([#595](https://github.com/aws-observability/aws-rum-web/issues/595)) ([b2d08c3](https://github.com/aws-observability/aws-rum-web/commit/b2d08c31b25494ee139683736befbd90d024b187))

## [1.21.0](https://github.com/aws-observability/aws-rum-web/compare/release/1.20.x...release/1.21.x) (2025-03-17)


### Features

* add metadata field "aws:releaseId" ([#592](https://github.com/aws-observability/aws-rum-web/issues/592)) ([42f986a](https://github.com/aws-observability/aws-rum-web/commit/42f986ae8b5fd98d338a40d44563e7a818482fef))

## [1.20.0](https://github.com/aws-observability/aws-rum-web/compare/release/1.19.x...release/1.20.x) (2025-03-03)

### Features
* Support use of alias field ([0f403f5](https://github.com/aws-observability/aws-rum-web/commit/0f403f55ba911dc39088ef08aa7729d44486e2f6))

## [1.19.0](https://github.com/aws-observability/aws-rum-web/compare/v1.18.0...v1.19.0) (2024-07-09)


### Features

* support unique credential cookie names ([#560](https://github.com/aws-observability/aws-rum-web/issues/560)) ([a440016](https://github.com/aws-observability/aws-rum-web/commit/a440016e402ed03e5fb463e13d1bdde13dfe5f40))


### Bug Fixes

* reduce CDN size by tree shaking ([#563](https://github.com/aws-observability/aws-rum-web/issues/563)) ([c2da86e](https://github.com/aws-observability/aws-rum-web/commit/c2da86e8e92b8ca294f32de1d8ed8ded654762ca))

## [1.18.0](https://github.com/aws-observability/aws-rum-web/compare/v1.17.0...v1.18.0) (2024-05-29)


### Features

* keep alive when dispatch fails ([#524](https://github.com/aws-observability/aws-rum-web/issues/524)) ([87e4cb4](https://github.com/aws-observability/aws-rum-web/commit/87e4cb4eee9810823de0458a4c8c6158a1732c08))
* keep alive when dispatch fails with 401 ([#551](https://github.com/aws-observability/aws-rum-web/issues/551)) ([b9823bd](https://github.com/aws-observability/aws-rum-web/commit/b9823bd8e7ffe31f95d011abfa417183abeb2f89))
* keep earliest event when cache is full ([#537](https://github.com/aws-observability/aws-rum-web/issues/537)) ([339ab09](https://github.com/aws-observability/aws-rum-web/commit/339ab09c9e365fb0db6917a36ed4b5fb80d7183d))
* limit retries to 5xx and 429 ([#500](https://github.com/aws-observability/aws-rum-web/issues/500)) ([df90602](https://github.com/aws-observability/aws-rum-web/commit/df906023e81bfcd53c7b7e26abd4af531af353de))
* retry with exponential backoff ([#501](https://github.com/aws-observability/aws-rum-web/issues/501)) ([59904c8](https://github.com/aws-observability/aws-rum-web/commit/59904c8e00b2827e127a0a041908e152222a73cc))

### [1.17.2](https://github.com/aws-observability/aws-rum-web/compare/v1.17.1...v1.17.2) (2024-04-03)

### Bug Fixes

* Record resources with invalid names ([#532](https://github.com/aws-observability/aws-rum-web/issues/532)) ([1da86e7](https://github.com/aws-observability/aws-rum-web/commit/1da86e7b42aa9545f623a5d55ca7859481b81e54))

### [1.17.1](https://github.com/aws-observability/aws-rum-web/compare/v1.17.0...v1.17.1) (2024-02-26)


### Bug Fixes

* Allow title override in page attributes ([#508](https://github.com/aws-observability/aws-rum-web/issues/508)) ([f2195c6](https://github.com/aws-observability/aws-rum-web/commit/f2195c601f394592705d91215796065d60a7fd76))

## [1.17.0]((https://github.com/aws-observability/aws-rum-web/compare/v1.16.0...v1.17.0)) (2024-02-01)


### Features
* allow customization of default attributes ([#430](https://github.com/aws-observability/aws-rum-web/issues/430)) ([533f0bf](https://github.com/aws-observability/aws-rum-web/commit/533f0bfa771cf2a801cd73c9149d2d35a9cdd0a0))



### Bug Fixes

* Remove unnecessary import in the TTIPlugin ([#475](https://github.com/aws-observability/aws-rum-web/issues/475)) ([cc7c165](https://github.com/aws-observability/aws-rum-web/commit/cc7c165801d0c5e0a312b717213f5242a8b04f5d))
* Record 0 for headerSize if transferSize is 0 ([#496](https://github.com/aws-observability/aws-rum-web/issues/496)) ([776915e](https://github.com/aws-observability/aws-rum-web/commit/776915e432067345a859358c48ea08d3dfd5db97))
* Invalidate cognito identity and re-try ([#498](https://github.com/aws-observability/aws-rum-web/issues/498)) ([90aa77a](https://github.com/aws-observability/aws-rum-web/commit/90aa77afddbacf733a649ab42a18f1d6ccb8de8b))


## [1.16.0](https://github.com/aws-observability/aws-rum-web/compare/v1.15.0...v1.16.0) (2023-11-16)


### Features

* Allow override of domain metadata attribute ([#453](https://github.com/aws-observability/aws-rum-web/issues/453)) ([b658d45](https://github.com/aws-observability/aws-rum-web/commit/b658d45257c1632f183baace0f5a1e19ca78ede3))
* extend addXRayTraceIdHeader to accept allow list ([#466](https://github.com/aws-observability/aws-rum-web/issues/466)) ([fdc30fd](https://github.com/aws-observability/aws-rum-web/commit/fdc30fd99dd3fc133695fcbf40867bfd8175d0b2))
* Time to interactive ([#465](https://github.com/aws-observability/aws-rum-web/issues/465)) ([8cf2753](https://github.com/aws-observability/aws-rum-web/commit/8cf2753f5a8ad6bf0dfc5b7224bcaac2eee78ef8))


## [1.15.0](https://github.com/aws-observability/aws-rum-web/compare/v1.14.0...v1.15.0) (2023-10-02)


### Features

* Re-use Cognito identity id ([#437](https://github.com/aws-observability/aws-rum-web/issues/437)) ([81213b9](https://github.com/aws-observability/aws-rum-web/commit/81213b9ad9b2f4d611a08b4b4fc07ac493ab887a))
* add attributions for core web vitals: LCP, CLS, and FID ([#432](https://github.com/aws-observability/aws-rum-web/issues/432)) ([33892c5](https://github.com/aws-observability/aws-rum-web/commit/33892c5e091735e9449ab3683868cde1c89ac163))
* Add trace id to http events ([#447](https://github.com/aws-observability/aws-rum-web/issues/447)) ([f36a9b5](https://github.com/aws-observability/aws-rum-web/commit/f36a9b5580b5ebb995f79a1c1119f0c49fde5e31))
* getResourceType() uses initiatorType when file extension missing ([#451](https://github.com/aws-observability/aws-rum-web/issues/451)) ([8d1e715](https://github.com/aws-observability/aws-rum-web/commit/8d1e715357f398fb444a80ac5a6d741bec32851d))
* link lcp attribution to image resource and navigation page load ([#448](https://github.com/aws-observability/aws-rum-web/issues/448)) ([4b8506e](https://github.com/aws-observability/aws-rum-web/commit/4b8506e529b6cf2f5a045f54bd6c029df56c232a))



### Bug Fixes

* Add getId to enhanced authflow ([#433](https://github.com/aws-observability/aws-rum-web/issues/433)) ([8b95de0](https://github.com/aws-observability/aws-rum-web/commit/8b95de08580817a9006a86e23bf0a2eb002cdc51))
* Save deserialized credential object to Authentication member ([#436](https://github.com/aws-observability/aws-rum-web/issues/436)) ([6120c61](https://github.com/aws-observability/aws-rum-web/commit/6120c61ed3d25362fc9765496942c9e4ffe3e087))
* Update false-negative test case in Authentication.test ([#439](https://github.com/aws-observability/aws-rum-web/issues/439)) ([460770b](https://github.com/aws-observability/aws-rum-web/commit/460770b01fe4c5a4aa74d86201bca7dd0c81004f))
* Avoid overwriting existing trace header ([#449](https://github.com/aws-observability/aws-rum-web/issues/449)) ([965ea07](https://github.com/aws-observability/aws-rum-web/commit/965ea07d03aefe0bace9c0cd62bc0e1fea1df867))
* Record resource timing after load event ([#450](https://github.com/aws-observability/aws-rum-web/issues/450)) ([c0aa33a](https://github.com/aws-observability/aws-rum-web/commit/c0aa33aaf5975de9f726f0a9b4a89d87e4fc5000))
* XhrPlugin cleans cache on every record ([#454](https://github.com/aws-observability/aws-rum-web/issues/454)) ([1380511](https://github.com/aws-observability/aws-rum-web/commit/1380511287b1c0c8d689702a3ada2dd42f91e5bd))



## [1.14.0](https://github.com/aws-observability/aws-rum-web/compare/v1.13.0...v1.14.0) (2023-06-29)


### Features

* Ignore resources with non-http scheme ([#419](https://github.com/aws-observability/aws-rum-web/issues/419)) ([42a2ae5](https://github.com/aws-observability/aws-rum-web/commit/42a2ae568b954190db942377df32c7fc5b89686e))


### Bug Fixes

* Add @aws-sdk/querystring-builder as a dependency. ([#370](https://github.com/aws-observability/aws-rum-web/issues/370)) ([42662eb](https://github.com/aws-observability/aws-rum-web/commit/42662eb98695c027c3eef3ec6547527240486ac5))
* Export PageAttributes type. ([#369](https://github.com/aws-observability/aws-rum-web/issues/369)) ([4b78dc1](https://github.com/aws-observability/aws-rum-web/commit/4b78dc14799151422bee07f6263c1aaa098354f6))
* Handle missing pageId in metadata when page is resumed ([#388](https://github.com/aws-observability/aws-rum-web/issues/388)) ([f81bcf2](https://github.com/aws-observability/aws-rum-web/commit/f81bcf24e8094a65fe2b99e6bbe65196ec2ea595))
* Hardcode webclient version ([#381](https://github.com/aws-observability/aws-rum-web/issues/381)) ([bc1c15f](https://github.com/aws-observability/aws-rum-web/commit/bc1c15ff7c6cc85a3d5843ba343e194b88449921))
* Transpile [@aws-sdk](https://github.com/aws-sdk) to ES5. ([#363](https://github.com/aws-observability/aws-rum-web/issues/363)) ([f63150d](https://github.com/aws-observability/aws-rum-web/commit/f63150df6ed6a9d8a877ccfe8e160c5a8d9873ec))
* Update entry point in package.json ([#377](https://github.com/aws-observability/aws-rum-web/issues/377)) ([7877e86](https://github.com/aws-observability/aws-rum-web/commit/7877e86ae4fd2f74cac8d603a59272eec015a852))
* Update version during release workflow only ([#359](https://github.com/aws-observability/aws-rum-web/issues/359)) ([f6b7bd7](https://github.com/aws-observability/aws-rum-web/commit/f6b7bd744ec9e8413b93a2069c40b815e4ddc9ab))

## [1.13.0](https://github.com/aws-observability/aws-rum-web/compare/v1.12.0...v1.13.0) (2023-02-23)


### Features

* Create a session ID when cookies are disabled, in order to link all events in a single page together([#314](https://github.com/aws-observability/aws-rum-web/issues/314)) ([6943587](https://github.com/aws-observability/aws-rum-web/commit/6943587259b8d7623742656199dc26b26b5bcd5d))
* Increase default stack trace length from 200 to 1000([#313](https://github.com/aws-observability/aws-rum-web/issues/313)) ([28e34c5](https://github.com/aws-observability/aws-rum-web/commit/28e34c5ad541e1fc1e0b12c1a937289df5911791))
* Record referrer and referrer's domain in the event details of a page-view-event ([#327](https://github.com/aws-observability/aws-rum-web/issues/327)) ([a414c92](https://github.com/aws-observability/aws-rum-web/commit/a414c9265b37f9eafe7ae6475fe71357beadbcfc))
* Record the webclient version and web client installation method in event metadata([#321](https://github.com/aws-observability/aws-rum-web/issues/321)) ([97c543a](https://github.com/aws-observability/aws-rum-web/commit/97c543a13d845bb4c2683c2b6b85ac97237fa410))
* Record time spent on a page in the event details of a page-view-event ( ([#341](https://github.com/aws-observability/aws-rum-web/pull/341))([d1c3b17](https://github.com/aws-observability/aws-rum-web/commit/d1c3b176db0d070faa44cd547c42ed907167d51b))

### Bug Fixes

* Add type to recordJsErrorEvent parameter ([#339](https://github.com/aws-observability/aws-rum-web/issues/339)) ([2ee6ffa](https://github.com/aws-observability/aws-rum-web/commit/2ee6ffa115f448e5f43b18b6af6f58750c35e544))


## [1.12.0](https://github.com/aws-observability/aws-rum-web/compare/v1.11.0...v1.12.0) (2022-11-17)


### Features

* Add recordEvent API and expose Plugin to enable recording of custom events ([#188](https://github.com/aws-observability/aws-rum-web/issues/188)) ([3e16093](https://github.com/aws-observability/aws-rum-web/commit/3e16093ec11db86eb404888b83e0e947606a0976))


### Bug Fixes

* Populate http method from RequestInfo ([#280](https://github.com/aws-observability/aws-rum-web/issues/280)) ([eb96760](https://github.com/aws-observability/aws-rum-web/commit/eb967602080144094f0b206a3afb48d889480504))

## [1.11.0](https://github.com/aws-observability/aws-rum-web/compare/v1.10.0...v1.11.0) (2022-10-28)


### Features

* Add config option to omit request signature. ([#273](https://github.com/aws-observability/aws-rum-web/issues/273)) ([49ae45c](https://github.com/aws-observability/aws-rum-web/commit/49ae45cc921340cbcf2fd66f8b5c1eaf0238370a))


### Bug Fixes

* Add cause to Cognito and STS error messages ([#272](https://github.com/aws-observability/aws-rum-web/issues/272)) ([00563f5](https://github.com/aws-observability/aws-rum-web/commit/00563f50d1387846c0564130b8207e4c47af3257))
* Fix hyperlink to MetadataAttributes section ([#270](https://github.com/aws-observability/aws-rum-web/issues/270)) ([a6e4388](https://github.com/aws-observability/aws-rum-web/commit/a6e43881b29a1c5e565c7390214791ad7416d6ea))
* Only ignore PutRumEvents requests on proxy endpoints. ([#266](https://github.com/aws-observability/aws-rum-web/issues/266)) ([74e6436](https://github.com/aws-observability/aws-rum-web/commit/74e64368471e5272b8635e5474d6bff20b220adb))

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
