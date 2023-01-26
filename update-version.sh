#!/bin/bash

version=$(jq -r '.version' package.json)
jq --arg version $version '.version |= $version' version.json >file.json.tmp && cp file.json.tmp version.json
rm -f file.json.tmp