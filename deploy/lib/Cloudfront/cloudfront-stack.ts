import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Bucket, BlockPublicAccess, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import {
  OriginAccessIdentity, 
  Distribution, 
  ViewerProtocolPolicy,
  CachePolicy,
  OriginRequestPolicy,
  ResponseHeadersPolicy
} from 'aws-cdk-lib/aws-cloudfront';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { RemovalPolicy } from 'aws-cdk-lib';
import * as path from 'path';
import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';

interface CloudfrontStackProps extends StackProps {
  domainName: string;
  certificate: ICertificate;
};

export class CloudfrontStack extends Stack {
  public readonly distribution: Distribution;

  constructor(scope: Construct, id: string, props: CloudfrontStackProps) {
    super(scope, id, props);

    const { domainName, certificate } = props;

    // Create an S3 bucket to host the website
    const bucket = new Bucket(this, 'SimpleRoutingWebappBucket', {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
    });

    // Create a CloudFront Origin Access Identity
    const originAccessIdentity = new OriginAccessIdentity(this, 'SimpleRoutingWebappOAI', {
      comment: 'OAI for SimpleRoutingWebapp bucket',
    });

    // Grant read permissions to CloudFront
    bucket.grantRead(originAccessIdentity);

    // Create a CloudFront distribution
    this.distribution = new Distribution(this, 'SimpleRoutingWebappDistribution', {
      defaultBehavior: {
        origin: new S3Origin(bucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
        originRequestPolicy: OriginRequestPolicy.CORS_S3_ORIGIN,
        responseHeadersPolicy: ResponseHeadersPolicy.SECURITY_HEADERS,
      },
      certificate,
      domainNames: [`simple.${domainName}`],
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
    new BucketDeployment(this, 'SimpleRoutingWebappDeploy', {
      sources: [Source.asset(path.join(__dirname, '../../../src/simple-routing-webapp/dist'))],
      destinationBucket: bucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
    });

    // Output the CloudFront URL
    new CfnOutput(this, 'SimpleRoutingWebappDistDomainName', {
      value: this.distribution.distributionDomainName,
      description: 'The domain name of the CloudFront distribution of Simple Routing Webapp',
    });

    // Output the S3 bucket name
    new CfnOutput(this, 'SimpleRoutingWebappBucketName', {
      value: bucket.bucketName,
      description: 'The name of the S3 bucket',
    });
  }
}
