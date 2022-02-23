#!/bin/bash

version=$(npm pkg get version | sed 's/"//g')
bucket=$1

aws s3api put-object --bucket $bucket --key "content/$version/cwr.js" --body build/assets/cwr.js --cache-control max-age=604800
aws s3api put-object --bucket $bucket --key "content/$version/cwr.js.map" --body build/assets/cwr.js.map --cache-control max-age=604800
aws s3api put-object --bucket $bucket --key "content/$version/LICENSE-THIRD-PARTY" --body LICENSE-THIRD-PARTY --cache-control max-age=604800
aws s3api put-object --bucket $bucket --key "content/$version/LICENSE" --body LICENSE --cache-control max-age=604800

if [[ $version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]
then
    minorUpdate=$(echo $version | sed -En "s/^([0-9]+\.)[0-9]+\.[0-9]+/\1x/p")
    aws s3api put-object --bucket $bucket --key "content/$minorUpdate/cwr.js" --body build/assets/cwr.js --cache-control max-age=7200
    aws s3api put-object --bucket $bucket --key "content/$minorUpdate/cwr.js.map" --body build/assets/cwr.js.map --cache-control max-age=7200
    aws s3api put-object --bucket $bucket --key "content/$minorUpdate/LICENSE-THIRD-PARTY" --body LICENSE-THIRD-PARTY --cache-control max-age=7200
    aws s3api put-object --bucket $bucket --key "content/$minorUpdate/LICENSE" --body LICENSE --cache-control max-age=7200

    patchUpdate=$(echo $version | sed -En "s/^([0-9]+\.[0-9]+\.)[0-9]+/\1x/p")
    aws s3api put-object --bucket $bucket --key "content/$patchUpdate/cwr.js" --body build/assets/cwr.js --cache-control max-age=7200
    aws s3api put-object --bucket $bucket --key "content/$patchUpdate/cwr.js.map" --body build/assets/cwr.js.map --cache-control max-age=7200
    aws s3api put-object --bucket $bucket --key "content/$patchUpdate/LICENSE-THIRD-PARTY" --body LICENSE-THIRD-PARTY --cache-control max-age=7200
    aws s3api put-object --bucket $bucket --key "content/$patchUpdate/LICENSE" --body LICENSE --cache-control max-age=7200
fi
