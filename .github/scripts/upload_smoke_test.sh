bucket=$1
aws s3api put-object --bucket $bucket --key "smoke.html" --body processed_smoke.html --content-type "text/html"
