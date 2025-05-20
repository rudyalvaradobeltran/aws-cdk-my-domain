import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DnsValidatedCertificate, ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { HostedZone, IHostedZone } from 'aws-cdk-lib/aws-route53';

interface ACMStackProps extends StackProps {
  domainName: string;
}

export class ACMStack extends Stack {
  public readonly certificate: ICertificate;
  public readonly hostedZone: IHostedZone;

  constructor(scope: Construct, id: string, props: ACMStackProps) {
    super(scope, id, props);

    const { domainName } = props;

    // Get the hosted zone for your domain
    this.hostedZone = HostedZone.fromLookup(this, 'HostedZone', {
      domainName,
    });
    
    // Create a certificate for your domain
    this.certificate = new DnsValidatedCertificate(this, 'SiteCertificate', {
      domainName,
      hostedZone: this.hostedZone,
      region: props.env?.region, // CloudFront requires certificates in us-east-1
    });
  }
}