#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CloudfrontStack } from '../lib/cloudfront-stack';
import { Route53Stack } from '../lib/route53-stack';
import { ACMStack } from '../lib/acm-stack';
import { IWebsiteList } from '../interfaces/interfaces';

const app = new cdk.App();

const domainName = process.env.DOMAIN;

if (!domainName) {
  throw new Error('DOMAIN environment variable is required');
}

// Define websites
const websites: IWebsiteList = [
  { name: 'SimpleRoutingWebapp', prefix: 'simple', folder: 'simple-routing-webapp' }
];

// Create an ACM stack
const acmStack = new ACMStack(app, 'ACMStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1', // ACM certificates for CloudFront must be in us-east-1
  },
  domainName,
  websites
});

// Create a CloudFront stack for each website
const cloudfrontStacks = websites.map(website => {
  return new CloudfrontStack(app, `${website.name}CloudfrontStack`, {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
    domainName,
    certificate: acmStack.certificates.get(website.prefix)!,
    website: website
  });
});

// Create a Route53 stack for each website
websites.forEach((website, index) => {
  new Route53Stack(app, `${website.name}Route53Stack`, {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    },
    distribution: cloudfrontStacks[index].distribution,
    domainName,
    hostedZone: acmStack.hostedZone,
    certificate: acmStack.certificates.get(website.prefix)!,
    website
  });
});