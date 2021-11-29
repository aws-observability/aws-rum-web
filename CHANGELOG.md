# Changelog for AWS RUM Web Client

<!--LATEST=1.0.2-->
<!--ENTRYINSERT-->

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
