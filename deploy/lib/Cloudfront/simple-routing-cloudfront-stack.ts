import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { RemovalPolicy } from 'aws-cdk-lib';
import * as path from 'path';

export class SimpleRoutingCloudfrontStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create an S3 bucket to host the website
    const simpleRoutingWebappBucket = new s3.Bucket(this, 'SimpleRoutingWebappBucket', {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // Create a CloudFront Origin Access Identity
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'SimpleRoutingWebappOAI', {
      comment: 'OAI for Simple Routing Webapp bucket',
    });

    // Grant read permissions to CloudFront
    simpleRoutingWebappBucket.grantRead(originAccessIdentity);

    // Create a CloudFront distribution
    const distribution = new cloudfront.Distribution(this, 'SimpleRoutingWebappDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(simpleRoutingWebappBucket, { // I'll maintain origin.S3Origin although the IDE says it's deprecated
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
    });

    // Deploy the built files to S3
    new s3deploy.BucketDeployment(this, 'SimpleRoutingWebappDeploy', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../../src/dist'))],
      destinationBucket: simpleRoutingWebappBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    // Output the CloudFront URL
    new cdk.CfnOutput(this, 'SimpleRoutingWebappDistDomainName', {
      value: distribution.distributionDomainName,
      description: 'The domain name of the CloudFront distribution of Simple Routing Webapp',
    });

    // Output the S3 bucket name
    new cdk.CfnOutput(this, 'SimpleRoutingWebappBucketName', {
      value: simpleRoutingWebappBucket.bucketName,
      description: 'The name of the S3 bucket',
    });
  }
}
