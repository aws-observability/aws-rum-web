#!/bin/bash

version=$(npm pkg get version | sed 's/"//g')
bucket=$1

echo "current-version=$version" >> $GITHUB_OUTPUT

aws s3api put-object --bucket $bucket --key "content/$version/cwr.js" --body build/assets/cwr.js --cache-control max-age=604800 --content-type "text/javascript"
aws s3api put-object --bucket $bucket --key "content/$version/cwr.js.map" --body build/assets/cwr.js.map --cache-control max-age=604800
aws s3api put-object --bucket $bucket --key "content/$version/LICENSE-THIRD-PARTY" --body LICENSE-THIRD-PARTY --cache-control max-age=604800
aws s3api put-object --bucket $bucket --key "content/$version/LICENSE" --body LICENSE --cache-control max-age=604800

if [[ $version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]
then
    echo $version | aws s3 cp - s3://$bucket/content/current

    minorUpdate=$(echo $version | sed -En "s/^([0-9]+\.)[0-9]+\.[0-9]+/\1x/p")
    aws s3api put-object --bucket $bucket --key "content/$minorUpdate/cwr.js" --body build/assets/cwr.js --cache-control max-age=7200 --content-type "text/javascript"
    aws s3api put-object --bucket $bucket --key "content/$minorUpdate/cwr.js.map" --body build/assets/cwr.js.map --cache-control max-age=7200
    aws s3api put-object --bucket $bucket --key "content/$minorUpdate/LICENSE-THIRD-PARTY" --body LICENSE-THIRD-PARTY --cache-control max-age=7200
    aws s3api put-object --bucket $bucket --key "content/$minorUpdate/LICENSE" --body LICENSE --cache-control max-age=7200

    patchUpdate=$(echo $version | sed -En "s/^([0-9]+\.[0-9]+\.)[0-9]+/\1x/p")
    aws s3api put-object --bucket $bucket --key "content/$patchUpdate/cwr.js" --body build/assets/cwr.js --cache-control max-age=7200 --content-type "text/javascript"
    aws s3api put-object --bucket $bucket --key "content/$patchUpdate/cwr.js.map" --body build/assets/cwr.js.map --cache-control max-age=7200
    aws s3api put-object --bucket $bucket --key "content/$patchUpdate/LICENSE-THIRD-PARTY" --body LICENSE-THIRD-PARTY --cache-control max-age=7200
    aws s3api put-object --bucket $bucket --key "content/$patchUpdate/LICENSE" --body LICENSE --cache-control max-age=7200

    # update versions.csv file
    fileName="versions.csv"

    # if file not found, returns NoSuchKey error
    aws s3api get-object --bucket $bucket --key "content/$fileName" $fileName 

    versionsFileDir="./$fileName";
    scriptVersion="arw-script,$version"
    moduleVersion="arw-module,$version"

    echo $scriptVersion >> $versionsFileDir
    echo $moduleVersion >> $versionsFileDir

    updatedVersions=$(<$versionsFileDir)
    echo "$updatedVersions" | aws s3 cp - s3://$bucket/content/versions.csv

    rm -f $versionsFileDir
fi