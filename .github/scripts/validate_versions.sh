#!/bin/bash
bucket=$1

# exit when any command fails
set -e

delete_local_file() {
    rm -f $versionsFileDir 
}

fileName="versions.csv"

# if file not found, throws NoSuchKey error
aws s3api get-object --bucket $bucket --key "content/versions.csv" $fileName 

versionsFileDir="./$fileName";
versions=$(<$versionsFileDir)

allPairsArr=(${versions});

# verify current versions in versions.csv file contain valid client,version pairs
scriptString="arw-script"
moduleString="arw-module"

for singlePair in "${allPairsArr[@]}"; 
do 
    IFS=',' read -ra singlePairArr <<< "$singlePair"

    if [ ${singlePairArr[0]} != $scriptString ] && [ ${singlePairArr[0]} != $moduleString ]
    then 
        delete_local_file

        echo ERROR: INVALID CLIENT
        echo ${singlePairArr[0]}
        exit 1
    fi

    if ! [[ ${singlePairArr[1]} =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]
    then
        delete_local_file

        
        echo ERROR: INVALID VERSION
        echo ${singlePairArr[1]}
        exit 1
    fi
    
done

delete_local_file