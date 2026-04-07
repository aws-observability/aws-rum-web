PRE_OR_POST_RELEASE=$1
MODULE_TYPE=$2

REPO_ROOT="/home/runner/work/aws-rum-web/aws-rum-web"
PACK_DIR="$REPO_ROOT/packages/aws-rum-web"
CORE_DIR="$REPO_ROOT/packages/core"
SLIM_DIR="$REPO_ROOT/packages/aws-rum-slim"

if [ "$PRE_OR_POST_RELEASE" = "PRE" ]; then 
    if [ "$MODULE_TYPE" = "NPM-ES" ]; then  
        cd smoke/smoke-test-application-NPM-ES
        npm uninstall aws-rum-web
        npm run clean 
        npm install 
        npm install $(npm pack $CORE_DIR --pack-destination . | tail -1)
        npm install $(npm pack $SLIM_DIR --pack-destination . | tail -1)
        npm install $(npm pack $PACK_DIR --pack-destination . | tail -1)
        npm run build
    elif [ "$MODULE_TYPE" = "NPM-CJS" ]; then  
        cd smoke/smoke-test-application-NPM-CJS
        npm uninstall aws-rum-web
        npm run clean 
        npm install 
        npm install $(npm pack $CORE_DIR --pack-destination . | tail -1)
        npm install $(npm pack $SLIM_DIR --pack-destination . | tail -1)
        npm install $(npm pack $PACK_DIR --pack-destination . | tail -1)
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

