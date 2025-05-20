import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { IHostedZone, ARecord, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget }  from 'aws-cdk-lib/aws-route53-targets';
import { Distribution } from 'aws-cdk-lib/aws-cloudfront';
import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { IWebsite } from '../interfaces/interfaces';

interface Route53StackProps extends StackProps {
  distribution: Distribution;
  domainName: string;
  hostedZone: IHostedZone;
  certificate: ICertificate;
  website: IWebsite;
}

export class Route53Stack extends Stack {
  private readonly domainName: string;

  constructor(scope: Construct, id: string, props: Route53StackProps) {
    super(scope, id, props);

    const { distribution, domainName, hostedZone, website } = props;
    this.domainName = domainName;

    // If distribution is provided, create the DNS records
    if (distribution) {
      this.createDnsRecords(distribution, hostedZone, website);
    }

    // Output the domain name
    new CfnOutput(this, `${website.name}DomainName`, {
      value: `${website.prefix}.${domainName}`,
      description: 'The domain name of the website',
    });

    // Create A records for both the domain and www subdomain
    new CfnOutput(this, `${website.name}DistributionDomainName`, {
      value: distribution.distributionDomainName,
      description: 'The CloudFront distribution domain name',
    });
  }

  public createDnsRecords(distribution: Distribution, hostedZone: IHostedZone, website: IWebsite): void {
    // Create a subdomain record
    new ARecord(this, `${website.name}SiteAliasRecord`, {
      recordName: `${website.prefix}.${this.domainName}`,
      target: RecordTarget.fromAlias(
        new CloudFrontTarget(distribution)
      ),
      zone: hostedZone,
    });

    // Create a www subdomain record
    new ARecord(this, `${website.name}WwwSiteAliasRecord`, {
      recordName: `www.${website.prefix}.${this.domainName}`,
      target: RecordTarget.fromAlias(
        new CloudFrontTarget(distribution)
      ),
      zone: hostedZone,
    });
  }
}