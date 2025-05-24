import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DnsValidatedCertificate, ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { HostedZone, IHostedZone } from 'aws-cdk-lib/aws-route53';
import { IWebsiteList } from '../../interfaces/interfaces';

interface ACMStackProps extends StackProps {
  domainName: string;
  websites: IWebsiteList;
}

export class ACMStack extends Stack {
  public readonly certificate: ICertificate;
  public readonly hostedZone: IHostedZone;
  public readonly certificates: Map<string, ICertificate>;

  constructor(scope: Construct, id: string, props: ACMStackProps) {
    super(scope, id, props);

    const { domainName, websites } = props;
    this.certificates = new Map();

    // Get the hosted zone for your domain
    this.hostedZone = HostedZone.fromLookup(this, 'HostedZone', {
      domainName,
    });
    
    // Create a certificate for all websites
    const allDomains = websites.flatMap(website => [
      `${website.prefix}.${domainName}`,
      `www.${website.prefix}.${domainName}`
    ]);

    this.certificate = new DnsValidatedCertificate(this, 'SiteCertificate', {
      domainName: allDomains[0], // Primary domain
      subjectAlternativeNames: allDomains.slice(1), // All other domains
      hostedZone: this.hostedZone,
      region: props.env?.region, // CloudFront requires certificates in us-east-1
    });

    // Store individual certificates for each website
    websites.forEach(website => {
      this.certificates.set(website.prefix, this.certificate);
    });
  }
}