#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CloudfrontStack } from '../lib/Cloudfront/cloudfront-stack';
import { Route53Stack } from '../lib/Route53/route53-stack';
import { ACMStack } from '../lib/ACM/acm-stack';
import { IWebsiteSet, routingPolicyType } from '../interfaces/interfaces';

const app = new cdk.App();

const domainName = process.env.DOMAIN;

if (!domainName) {
  throw new Error('DOMAIN environment variable is required');
}

// Define websites
const websiteSets: Array<IWebsiteSet> = [
  { routingPolicyType: routingPolicyType.simple,
    websites: [
      { name: 'SimpleRoutingWebapp', folder: 'simple-routing-webapp' }
    ]
  },
  {
    routingPolicyType: routingPolicyType.weighted,
    websites: [
      { name: 'WeightedRoutingWebapp70', folder: 'weighted-routing-webapp/weighted-routing-webapp-70', weight: 70 },
      { name: 'WeightedRoutingWebapp30', folder: 'weighted-routing-webapp/weighted-routing-webapp-30', weight: 30 }      
    ]
  }
];

// Create an ACM stack
const acmStack = new ACMStack(app, 'ACMStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1', // ACM certificates for CloudFront must be in us-east-1
  },
  domainName,
  websiteSets
});

// Create a CloudFront and a Route53 stack for each website
websiteSets.map(websiteSet => {
  websiteSet.websites.map(website => {
    const cloudfrontStack = new CloudfrontStack(app, `${website.name}CloudfrontStack`, {
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
      },
      domainName,
      certificate: acmStack.certificates.get(websiteSet.routingPolicyType)!,
      routingPolicyType: websiteSet.routingPolicyType,
      website
    });

    new Route53Stack(app, `${website.name}Route53Stack`, {
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
      },
      distribution: cloudfrontStack.distribution,
      domainName,
      hostedZone: acmStack.hostedZone,
      certificate: acmStack.certificates.get(websiteSet.routingPolicyType)!,
      routingPolicyType: websiteSet.routingPolicyType,
      website
    });
  });
});