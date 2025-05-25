import { Stack } from "aws-cdk-lib";
import { StackProps } from "aws-cdk-lib/core";
import { Construct } from "constructs";
import { aws_route53 as route53 } from "aws-cdk-lib";
import { aws_cloudfront as cloudfront } from "aws-cdk-lib";
import { aws_certificatemanager } from "aws-cdk-lib";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";
import { IWebsite, routingPolicyType, RoutingPolicyType } from "../../interfaces/interfaces";

export interface Route53StackProps extends StackProps {
  distribution: cloudfront.Distribution;
  domainName: string;
  hostedZone: route53.IHostedZone;
  certificate: aws_certificatemanager.ICertificate;
  routingPolicyType: RoutingPolicyType;
  website: IWebsite;
}

export class Route53Stack extends Stack {
  constructor(scope: Construct, id: string, props: Route53StackProps) {
    super(scope, id, props);

    const recordName = `${props.routingPolicyType}.${props.domainName}`;

    if (props.routingPolicyType === routingPolicyType.simple) {
      // Create a simple A record for the distribution
      new route53.ARecord(this, `${props.website.name}-Record`, {
        zone: props.hostedZone,
        recordName,
        target: route53.RecordTarget.fromAlias(
          new CloudFrontTarget(props.distribution)
        ),
      });
    } else if (props.routingPolicyType === routingPolicyType.weighted) {
      // Create a weighted A record for the distribution
      new route53.ARecord(this, `${props.website.name}WeightedRecord`, {
        zone: props.hostedZone,
        recordName,
        target: route53.RecordTarget.fromAlias(
          new CloudFrontTarget(props.distribution)
        ),
        weight: props.website.weight,
        setIdentifier: `${props.website.name}-${props.website.weight}`,
      });
    }

    // Create a health check for monitoring
    new route53.CfnHealthCheck(this, `${props.website.name}HealthCheck`, {
      healthCheckConfig: {
        type: "HTTP",
        port: 80,
        resourcePath: "/",
        fullyQualifiedDomainName: props.distribution.distributionDomainName,
        requestInterval: 30,
        failureThreshold: 3
      }
    });
  }
}