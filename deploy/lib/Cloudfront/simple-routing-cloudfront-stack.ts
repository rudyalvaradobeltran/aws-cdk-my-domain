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

interface SimpleRoutingCloudfrontStackProps extends StackProps {
  domainName: string;
  certificate: ICertificate;
}

export class SimpleRoutingCloudfrontStack extends Stack {
  public readonly distribution: Distribution;

  constructor(scope: Construct, id: string, props: SimpleRoutingCloudfrontStackProps) {
    super(scope, id, props);

    const { domainName, certificate } = props;

    // Create an S3 bucket to host the website
    const simpleRoutingWebappBucket = new Bucket(this, 'SimpleRoutingWebappBucket', {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
    });

    // Create a CloudFront Origin Access Identity
    const originAccessIdentity = new OriginAccessIdentity(this, 'SimpleRoutingWebappOAI', {
      comment: 'OAI for Simple Routing Webapp bucket',
    });

    // Grant read permissions to CloudFront
    simpleRoutingWebappBucket.grantRead(originAccessIdentity);

    // Create a CloudFront distribution
    this.distribution = new Distribution(this, 'SimpleRoutingWebappDistribution', {
      defaultBehavior: {
        origin: new S3Origin(simpleRoutingWebappBucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
        originRequestPolicy: OriginRequestPolicy.CORS_S3_ORIGIN,
        responseHeadersPolicy: ResponseHeadersPolicy.SECURITY_HEADERS,
      },
      domainNames: [`simple.${domainName}`, `www.simple.${domainName}`],
      certificate,
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
      destinationBucket: simpleRoutingWebappBucket,
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
      value: simpleRoutingWebappBucket.bucketName,
      description: 'The name of the S3 bucket',
    });
  }
}
