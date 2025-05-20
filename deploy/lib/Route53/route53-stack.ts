import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { IHostedZone, ARecord, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget }  from 'aws-cdk-lib/aws-route53-targets';
import { Distribution } from 'aws-cdk-lib/aws-cloudfront';
import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';

interface Route53StackProps extends StackProps {
  distribution: Distribution;
  domainName: string;
  hostedZone: IHostedZone;
  certificate: ICertificate;
}

export class Route53Stack extends Stack {
  private readonly domainName: string;

  constructor(scope: Construct, id: string, props: Route53StackProps) {
    super(scope, id, props);

    const { distribution, domainName, hostedZone } = props;
    this.domainName = domainName;
    const prefix = 'simple';

    // If distribution is provided, create the DNS records
    if (distribution) {
      this.createDnsRecords(distribution, hostedZone, prefix);
    }

    // Output the domain name
    new CfnOutput(this, 'DomainName', {
      value: domainName,
      description: 'The domain name of the website',
    });
  }

  public createDnsRecords(distribution: Distribution, hostedZone: IHostedZone, prefix: string): void {
    // Create a subdomain record
    new ARecord(this, 'SiteAliasRecord', {
      recordName: `${prefix}.${this.domainName}`,
      target: RecordTarget.fromAlias(
        new CloudFrontTarget(distribution)
      ),
      zone: hostedZone,
    });

    // Create a www subdomain record
    new ARecord(this, 'WwwSiteAliasRecord', {
      recordName: `www.${prefix}.${this.domainName}`,
      target: RecordTarget.fromAlias(
        new CloudFrontTarget(distribution)
      ),
      zone: hostedZone,
    });
  }
}