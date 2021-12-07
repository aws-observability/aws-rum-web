#!/bin/bash

version=$1
bucket=$2

aws s3api put-object --bucket $bucket --key "content/$version/cwr.js" --body build/assets/cwr.js
aws s3api put-object --bucket $bucket --key "content/$version/LICENSE-THIRD-PARTY" --body LICENSE-THIRD-PARTY

if [[ $version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]
then
    minorUpdate=$(echo $version | sed -En "s/^([0-9]+\.)[0-9]+\.[0-9]+/\1x/p")
    aws s3api put-object --bucket $bucket --key "content/$minorUpdate/cwr.js" --body build/assets/cwr.js
    aws s3api put-object --bucket $bucket --key "content/$minorUpdate/LICENSE-THIRD-PARTY" --body LICENSE-THIRD-PARTY
    patchUpdate=$(echo $version | sed -En "s/^([0-9]+\.[0-9]+\.)[0-9]+/\1x/p")
    aws s3api put-object --bucket $bucket --key "content/$patchUpdate/cwr.js" --body build/assets/cwr.js
    aws s3api put-object --bucket $bucket --key "content/$patchUpdate/LICENSE-THIRD-PARTY" --body LICENSE-THIRD-PARTY
fi