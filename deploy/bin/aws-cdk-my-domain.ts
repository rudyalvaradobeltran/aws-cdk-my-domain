#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SimpleRoutingCloudfrontStack } from '../lib/Cloudfront/simple-routing-cloudfront-stack';
import { Route53Stack } from '../lib/Route53/route53-stack';
import { ACMStack } from '../lib/ACM/acm-stack';

const app = new cdk.App();

const domainName = process.env.DOMAIN;

if (!domainName) {
  throw new Error('DOMAIN environment variable is required');
}

const acmStack = new ACMStack(app, 'ACMStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1', // ACM certificates for CloudFront must be in us-east-1
  },
  domainName: domainName
});

const cloudfrontStack = new SimpleRoutingCloudfrontStack(app, 'SimpleRoutingCloudfrontStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  domainName,
  certificate: acmStack.certificate,
});

const route53Stack = new Route53Stack(app, 'Route53Stack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  distribution: cloudfrontStack.distribution,
  domainName,
  hostedZone: acmStack.hostedZone,
  certificate: acmStack.certificate
});