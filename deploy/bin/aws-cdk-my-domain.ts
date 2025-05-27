#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CloudfrontStack } from '../lib/Cloudfront/cloudfront-stack';
import { Route53Stack } from '../lib/Route53/route53-stack';
import { ACMStack } from '../lib/ACM/acm-stack';
import { VpcStack } from '../lib/VPC/vpc-stack';
import { Ec2Stack } from '../lib/EC2/ec2-stack';

const app = new cdk.App();

const domainName = process.env.DOMAIN;
const alarmEmail = process.env.ALARM_EMAIL;

if (!domainName) {
  throw new Error('DOMAIN environment variable is required');
}

// Create a VPC stack
const VPCStack = new VpcStack(app, 'VPCStack');

// Create an EC2 stack (2 instances)
const ec2Stack = new Ec2Stack(app, 'EC2Stack', {
  VPC: VPCStack.VPC,
  instances: ['InstanceOne', 'InstanceTwo']
});

/*
// Create an ACM stack
const acmStack = new ACMStack(app, 'ACMStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1', // ACM certificates for CloudFront must be in us-east-1
  },
  domainName
});

// Create a CloudFront and a Route53 stack
const cloudfrontStack = new CloudfrontStack(app, `SimpleRoutingWebappCloudfrontStack`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  domainName,
  certificate: acmStack.certificates.get('simple')!
});

new Route53Stack(app, `SimpleRoutingWebappRoute53Stack`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  distribution: cloudfrontStack.distribution,
  domainName,
  hostedZone: acmStack.hostedZone,
  certificate: acmStack.certificates.get('simple')!,
  alarmEmail
});

*/