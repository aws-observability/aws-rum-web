bucket=$1
version=$(npm pkg get version | sed 's/"//g')

# CDN 
aws s3api put-object --bucket $bucket --key "smoke-$version.html" --body processed_smoke.html --content-type "text/html"
aws s3api put-object --bucket $bucket --key "smoke_w3c_format_enabled-$version.html" --body processed_smoke_w3c_format_enabled.html --content-type "text/html"

# NPM ES 
aws s3api put-object --bucket $bucket --key "npm/es/$version/smoke.html" --body smoke/smoke-test-application-NPM-ES/app/smoke.html --content-type "text/html"
aws s3api put-object --bucket $bucket --key "npm/es/$version/smoke_w3c_format_enabled.html" --body smoke/smoke-test-application-NPM-ES/app/smoke_w3c_format_enabled.html --content-type "text/html"
aws s3api put-object --bucket $bucket --key "npm/es/$version/loader_npm_rum_tmp.js" --body smoke/smoke-test-application-NPM-ES/build/dev/loader_npm_rum_tmp.js --content-type application/x-javascript
aws s3api put-object --bucket $bucket --key "npm/es/$version/loader_npm_rum_tmp_2.js" --body smoke/smoke-test-application-NPM-ES/build/dev/loader_npm_rum_tmp_2.js --content-type application/x-javascript
aws s3api put-object --bucket $bucket --key "npm/es/$version/loader_npm_rum_w3c_format_enabled_tmp.js" --body smoke/smoke-test-application-NPM-ES/build/dev/loader_npm_rum_w3c_format_enabled_tmp.js --content-type application/x-javascript

# NPM CJS
aws s3api put-object --bucket $bucket --key "npm/cjs/$version/smoke.html" --body smoke/smoke-test-application-NPM-CJS/app/smoke.html --content-type "text/html"
aws s3api put-object --bucket $bucket --key "npm/cjs/$version/smoke_w3c_format_enabled.html" --body smoke/smoke-test-application-NPM-CJS/app/smoke_w3c_format_enabled.html --content-type "text/html"
aws s3api put-object --bucket $bucket --key "npm/cjs/$version/loader_npm_rum_tmp.js" --body smoke/smoke-test-application-NPM-CJS/build/dev/loader_npm_rum_tmp.js --content-type application/x-javascript
aws s3api put-object --bucket $bucket --key "npm/cjs/$version/loader_npm_rum_tmp_2.js" --body smoke/smoke-test-application-NPM-CJS/build/dev/loader_npm_rum_tmp_2.js --content-type application/x-javascript
aws s3api put-object --bucket $bucket --key "npm/cjs/$version/loader_npm_rum_w3c_format_enabled_tmp.js" --body smoke/smoke-test-application-NPM-CJS/build/dev/loader_npm_rum_w3c_format_enabled_tmp.js --content-type application/x-javascript