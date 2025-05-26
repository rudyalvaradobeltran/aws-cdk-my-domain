import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Certificate, CertificateValidation, ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { HostedZone, IHostedZone } from 'aws-cdk-lib/aws-route53';

interface ACMStackProps extends StackProps {
  domainName: string;
}

export class ACMStack extends Stack {
  public readonly certificate: ICertificate;
  public readonly hostedZone: IHostedZone;
  public readonly certificates: Map<string, ICertificate>;

  constructor(scope: Construct, id: string, props: ACMStackProps) {
    super(scope, id, props);

    const { domainName } = props;
    this.certificates = new Map();

    // Get the hosted zone for your domain
    this.hostedZone = HostedZone.fromLookup(this, 'HostedZone', {
      domainName,
    });
    
    // Create a certificate for all websites
    this.certificate = new Certificate(this, 'Certificate', {
      domainName: `*.${domainName}`, // This covers all subdomains
      subjectAlternativeNames: [domainName], // Also cover the root domain
      validation: CertificateValidation.fromDns(this.hostedZone),
    });

    // Store the certificate
    this.certificates.set('simple', this.certificate);
  }
}