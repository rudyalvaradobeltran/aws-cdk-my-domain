#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { SimpleRoutingCloudfrontStack } from '../lib/Cloudfront/simple-routing-cloudfront-stack';

const app = new cdk.App();

const _env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION };

new SimpleRoutingCloudfrontStack(app, 'CloudFrontStack', {
  env: _env,
});