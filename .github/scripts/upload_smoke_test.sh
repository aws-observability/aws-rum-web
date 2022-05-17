bucket=$1
key=smoke-$(npm pkg get version | sed 's/"//g').html
aws s3api put-object --bucket $bucket --key "$key" --body processed_smoke.html --content-type "text/html"
