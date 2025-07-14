# App monitor details
MONITOR_ID=$1
REGION=$2
GUEST_ARN=$3
IDENTITY_POOL=$4
ENDPOINT=$5
CDN=$6
MONITOR_ID_2=$7
GUEST_ARN_2=$8
IDENTITY_POOL_2=$9
VERSION=$(npm pkg get version | sed 's/"//g')/cwr.js
CDN+=${VERSION}

# CDN
awk '{sub(/\$MONITOR_ID/,MONITOR_ID);sub(/\$REGION/,REGION);sub(/\$CDN/,CDN);sub(/\$GUEST_ARN/,GUEST_ARN);sub(/\$IDENTITY_POOL/,IDENTITY_POOL);sub(/\$ENDPOINT/,ENDPOINT);}1' \
 MONITOR_ID="'$MONITOR_ID'" REGION="'$REGION'" CDN="'$CDN'" GUEST_ARN="'$GUEST_ARN'" IDENTITY_POOL="'$IDENTITY_POOL'" ENDPOINT="'$ENDPOINT'" smoke/smoke-test-application-CDN/smoke.html > processed_smoke.html

awk '{sub(/\$MONITOR_ID/,MONITOR_ID);sub(/\$REGION/,REGION);sub(/\$CDN/,CDN);sub(/\$GUEST_ARN/,GUEST_ARN);sub(/\$IDENTITY_POOL/,IDENTITY_POOL);sub(/\$ENDPOINT/,ENDPOINT);}1' \
 MONITOR_ID="'$MONITOR_ID'" REGION="'$REGION'" CDN="'$CDN'" GUEST_ARN="'$GUEST_ARN'" IDENTITY_POOL="'$IDENTITY_POOL'" ENDPOINT="'$ENDPOINT'" smoke/smoke-test-application-CDN/smoke_w3c_format_enabled.html > processed_smoke_w3c_format_enabled.html

# Module ES
awk '{sub(/\$MONITOR_ID/,MONITOR_ID);sub(/\$REGION/,REGION);sub(/\$CDN/,CDN);sub(/\$GUEST_ARN/,GUEST_ARN);sub(/\$IDENTITY_POOL/,IDENTITY_POOL);sub(/\$ENDPOINT/,ENDPOINT);}1' \
 MONITOR_ID="'$MONITOR_ID'" REGION="'$REGION'" CDN="'$CDN'" GUEST_ARN="'$GUEST_ARN'" IDENTITY_POOL="'$IDENTITY_POOL'" ENDPOINT="'$ENDPOINT'" smoke/smoke-test-application-NPM-ES/src/loader-npm-rum.ts > smoke/smoke-test-application-NPM-ES/src/loader-npm-rum-tmp.ts

awk '{sub(/\$MONITOR_ID_2/,MONITOR_ID_2);sub(/\$REGION/,REGION);sub(/\$CDN/,CDN);sub(/\$GUEST_ARN_2/,GUEST_ARN_2);sub(/\$IDENTITY_POOL_2/,IDENTITY_POOL_2);sub(/\$ENDPOINT/,ENDPOINT);}1' \
 MONITOR_ID_2="'$MONITOR_ID_2'" REGION="'$REGION'" CDN="'$CDN'" GUEST_ARN_2="'$GUEST_ARN_2'" IDENTITY_POOL_2="'$IDENTITY_POOL_2'" ENDPOINT="'$ENDPOINT'" smoke/smoke-test-application-NPM-ES/src/loader-npm-rum-2.ts > smoke/smoke-test-application-NPM-ES/src/loader-npm-rum-tmp-2.ts

 awk '{sub(/\$MONITOR_ID/,MONITOR_ID);sub(/\$REGION/,REGION);sub(/\$CDN/,CDN);sub(/\$GUEST_ARN/,GUEST_ARN);sub(/\$IDENTITY_POOL/,IDENTITY_POOL);sub(/\$ENDPOINT/,ENDPOINT);}1' \
 MONITOR_ID="'$MONITOR_ID'" REGION="'$REGION'" CDN="'$CDN'" GUEST_ARN="'$GUEST_ARN'" IDENTITY_POOL="'$IDENTITY_POOL'" ENDPOINT="'$ENDPOINT'" smoke/smoke-test-application-NPM-ES/src/loader-npm-rum-w3c-format-enabled.ts > smoke/smoke-test-application-NPM-ES/src/loader-npm-rum-w3c-format-enabled-tmp.ts

# Module CJS
awk '{sub(/\$MONITOR_ID/,MONITOR_ID);sub(/\$REGION/,REGION);sub(/\$CDN/,CDN);sub(/\$GUEST_ARN/,GUEST_ARN);sub(/\$IDENTITY_POOL/,IDENTITY_POOL);sub(/\$ENDPOINT/,ENDPOINT);}1' \
 MONITOR_ID="'$MONITOR_ID'" REGION="'$REGION'" CDN="'$CDN'" GUEST_ARN="'$GUEST_ARN'" IDENTITY_POOL="'$IDENTITY_POOL'" ENDPOINT="'$ENDPOINT'" smoke/smoke-test-application-NPM-CJS/src/loader-npm-rum.ts > smoke/smoke-test-application-NPM-CJS/src/loader-npm-rum-tmp.ts

awk '{sub(/\$MONITOR_ID_2/,MONITOR_ID_2);sub(/\$REGION/,REGION);sub(/\$CDN/,CDN);sub(/\$GUEST_ARN_2/,GUEST_ARN_2);sub(/\$IDENTITY_POOL_2/,IDENTITY_POOL_2);sub(/\$ENDPOINT/,ENDPOINT);}1' \
 MONITOR_ID_2="'$MONITOR_ID_2'" REGION="'$REGION'" CDN="'$CDN'" GUEST_ARN_2="'$GUEST_ARN_2'" IDENTITY_POOL_2="'$IDENTITY_POOL_2'" ENDPOINT="'$ENDPOINT'" smoke/smoke-test-application-NPM-CJS/src/loader-npm-rum-2.ts > smoke/smoke-test-application-NPM-CJS/src/loader-npm-rum-tmp-2.ts

awk '{sub(/\$MONITOR_ID/,MONITOR_ID);sub(/\$REGION/,REGION);sub(/\$CDN/,CDN);sub(/\$GUEST_ARN/,GUEST_ARN);sub(/\$IDENTITY_POOL/,IDENTITY_POOL);sub(/\$ENDPOINT/,ENDPOINT);}1' \
 MONITOR_ID="'$MONITOR_ID'" REGION="'$REGION'" CDN="'$CDN'" GUEST_ARN="'$GUEST_ARN'" IDENTITY_POOL="'$IDENTITY_POOL'" ENDPOINT="'$ENDPOINT'" smoke/smoke-test-application-NPM-CJS/src/loader-npm-rum-w3c-format-enabled.ts > smoke/smoke-test-application-NPM-CJS/src/loader-npm-rum-w3c-format-enabled-tmp.ts