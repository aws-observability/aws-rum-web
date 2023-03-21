PRE_OR_POST_RELEASE=$1
MODULE_TYPE=$2


if [ "$PRE_OR_POST_RELEASE" = "PRE" ]; then 
    if [ "$MODULE_TYPE" = "NPM-ES" ]; then  
        cd smoke/smoke-test-application-NPM-ES
        npm uninstall aws-rum-web
        npm run clean 
        npm install 
        npm install /home/runner/work/aws-rum-web/aws-rum-web #Install locally 
        npm run build
    elif [ "$MODULE_TYPE" = "NPM-CJS" ]; then  
        cd smoke/smoke-test-application-NPM-CJS
        npm uninstall aws-rum-web
        npm run clean 
        npm install 
        npm install $(npm pack /home/runner/work/aws-rum-web/aws-rum-web | tail -1) #Install locally 
        npm run build
    else
        echo "Not a valid module type"
    fi
elif [ "$PRE_OR_POST_RELEASE" = "POST" ]; then

    if [ "$MODULE_TYPE" = "NPM-ES" ]; then  
        cd smoke/smoke-test-application-NPM-ES
        npm uninstall aws-rum-web
        npm run clean 
        npm install 
        npm install aws-rum-web #Install latest released direct from NPM 
        npm run build
    elif [ "$MODULE_TYPE" = "NPM-CJS" ]; then  
        cd smoke/smoke-test-application-NPM-CJS
        npm uninstall aws-rum-web
        npm run clean 
        npm install 
        npm install aws-rum-web #Install latest released direct from NPM 
        npm run build
    else
        echo "Not a valid module type"
    fi
else 
    echo "No valid option. Please provide PRE OR POST"
fi


