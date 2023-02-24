#!/bin/bash

version=$(jq -r '.version' package.json)
jq -n --arg version $version '{ "version" : $version}' > version.json