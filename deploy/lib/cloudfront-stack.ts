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
import { IWebsite } from '../interfaces/interfaces';

interface CloudfrontStackProps extends StackProps {
  domainName: string;
  certificate: ICertificate;
  website: IWebsite;
}

export class CloudfrontStack extends Stack {
  public readonly distribution: Distribution;

  constructor(scope: Construct, id: string, props: CloudfrontStackProps) {
    super(scope, id, props);

    const { domainName, certificate, website } = props;

    // Create an S3 bucket to host the website
    const bucket = new Bucket(this, `${website.name}Bucket`, {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
    });

    // Create a CloudFront Origin Access Identity
    const originAccessIdentity = new OriginAccessIdentity(this, `${website.name}OAI`, {
      comment: `OAI for ${website.name} bucket`,
    });

    // Grant read permissions to CloudFront
    bucket.grantRead(originAccessIdentity);

    // Create a CloudFront distribution
    this.distribution = new Distribution(this, `${website.name}Distribution`, {
      defaultBehavior: {
        origin: new S3Origin(bucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
        originRequestPolicy: OriginRequestPolicy.CORS_S3_ORIGIN,
        responseHeadersPolicy: ResponseHeadersPolicy.SECURITY_HEADERS,
      },
      domainNames: [`${website.prefix}.${domainName}`, `www.${website.prefix}.${domainName}`],
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
    new BucketDeployment(this, `${website.name}Deploy`, {
      sources: [Source.asset(path.join(__dirname, `../../../src/${website.folder}/dist`))],
      destinationBucket: bucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
    });

    // Output the CloudFront URL
    new CfnOutput(this, `${website.name}DistDomainName`, {
      value: this.distribution.distributionDomainName,
      description: 'The domain name of the CloudFront distribution of Simple Routing Webapp',
    });

    // Output the S3 bucket name
    new CfnOutput(this, `${website.name}BucketName`, {
      value: bucket.bucketName,
      description: 'The name of the S3 bucket',
    });
  }
}
