#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { RumExamples3xStack } from '../lib/rum-examples-stack';

const app = new cdk.App();

new RumExamples3xStack(app, 'RumExamples3xStack', {
    env: {
        account:
            process.env.RUM_EXAMPLES_ACCOUNT ?? process.env.CDK_DEFAULT_ACCOUNT,
        region:
            process.env.RUM_EXAMPLES_REGION ??
            process.env.CDK_DEFAULT_REGION ??
            'us-west-1'
    }
});
