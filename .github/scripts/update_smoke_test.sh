# App monitor details
MONITOR_ID=$1
REGION=$2
GUEST_ARN=$3
IDENTITY_POOL=$4
ENDPOINT=$5
CDN=$6
VERSION=$(npm pkg get version | sed 's/"//g')/cwr.js
CDN+=${VERSION}

# CDN
awk '{sub(/\$MONITOR_ID/,MONITOR_ID);sub(/\$REGION/,REGION);sub(/\$CDN/,CDN);sub(/\$GUEST_ARN/,GUEST_ARN);sub(/\$IDENTITY_POOL/,IDENTITY_POOL);sub(/\$ENDPOINT/,ENDPOINT);}1' \
 MONITOR_ID="'$MONITOR_ID'" REGION="'$REGION'" CDN="'$CDN'" GUEST_ARN="'$GUEST_ARN'" IDENTITY_POOL="'$IDENTITY_POOL'" ENDPOINT="'$ENDPOINT'" smoke/smoke-test-application-CDN/smoke.html > processed_smoke.html

# Module ES
awk '{sub(/\$MONITOR_ID/,MONITOR_ID);sub(/\$REGION/,REGION);sub(/\$CDN/,CDN);sub(/\$GUEST_ARN/,GUEST_ARN);sub(/\$IDENTITY_POOL/,IDENTITY_POOL);sub(/\$ENDPOINT/,ENDPOINT);}1' \
 MONITOR_ID="'$MONITOR_ID'" REGION="'$REGION'" CDN="'$CDN'" GUEST_ARN="'$GUEST_ARN'" IDENTITY_POOL="'$IDENTITY_POOL'" ENDPOINT="'$ENDPOINT'" smoke/smoke-test-application-NPM-ES/src/loader-npm-rum.ts > smoke/smoke-test-application-NPM-ES/src/loader-npm-rum-tmp.ts

# Module CJS
awk '{sub(/\$MONITOR_ID/,MONITOR_ID);sub(/\$REGION/,REGION);sub(/\$CDN/,CDN);sub(/\$GUEST_ARN/,GUEST_ARN);sub(/\$IDENTITY_POOL/,IDENTITY_POOL);sub(/\$ENDPOINT/,ENDPOINT);}1' \
 MONITOR_ID="'$MONITOR_ID'" REGION="'$REGION'" CDN="'$CDN'" GUEST_ARN="'$GUEST_ARN'" IDENTITY_POOL="'$IDENTITY_POOL'" ENDPOINT="'$ENDPOINT'" smoke/smoke-test-application-NPM-CJS/src/loader-npm-rum.ts > smoke/smoke-test-application-NPM-CJS/src/loader-npm-rum-tmp.ts
