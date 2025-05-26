import { Stack } from "aws-cdk-lib";
import { StackProps, Duration } from "aws-cdk-lib/core";
import { Construct } from "constructs";
import { IHostedZone, RecordTarget, CfnHealthCheck, ARecord } from "aws-cdk-lib/aws-route53";
import { Distribution } from "aws-cdk-lib/aws-cloudfront";
import { ICertificate } from "aws-cdk-lib/aws-certificatemanager";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";
import { Topic } from "aws-cdk-lib/aws-sns";
import { EmailSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
import { Alarm, Metric, TreatMissingData } from "aws-cdk-lib/aws-cloudwatch";
import { SnsAction } from "aws-cdk-lib/aws-cloudwatch-actions";

export interface Route53StackProps extends StackProps {
  distribution: Distribution;
  domainName: string;
  hostedZone: IHostedZone;
  certificate: ICertificate;
  alarmEmail?: string; // Optional email for notifications
}

export class Route53Stack extends Stack {
  constructor(scope: Construct, id: string, props: Route53StackProps) {
    super(scope, id, props);

    const recordName = `simple.${props.domainName}`;

    // Create a simple A record for the distribution
    new ARecord(this, 'SimpleRoutingWebappRecord', {
      zone: props.hostedZone,
      recordName,
      target: RecordTarget.fromAlias(
        new CloudFrontTarget(props.distribution)
      ),
    });

    // Create a simple www A record for the distribution
    new ARecord(this, 'SimpleRoutingWebappWWWRecord', {
      zone: props.hostedZone,
      recordName: `www.${recordName}`,
      target: RecordTarget.fromAlias(
        new CloudFrontTarget(props.distribution)
      ),
    });
    
    // Create a health check for monitoring
    const healthCheck = new CfnHealthCheck(this, 'SimpleRoutingWebappHealthCheck', {
      healthCheckConfig: {
        type: "HTTP",
        port: 80,
        resourcePath: "/",
        fullyQualifiedDomainName: props.distribution.distributionDomainName,
        requestInterval: 30,
        failureThreshold: 3
      }
    });

    // Create an SNS topic for notifications
    const alarmTopic = new Topic(this, 'SimpleRoutingWebappAlarmTopic', {
      displayName: 'Simple Routing Webapp Health Check Alarms',
    });

    // Add email subscription if email is provided
    if (props.alarmEmail) {
      alarmTopic.addSubscription(
        new EmailSubscription(props.alarmEmail)
      );
    }

    // Create a CloudWatch alarm for the health check
    new Alarm(this, 'SimpleRoutingWebappHealthCheckAlarm', {
      metric: new Metric({
        namespace: 'AWS/Route53',
        metricName: 'HealthCheckStatus',
        dimensionsMap: {
          HealthCheckId: healthCheck.attrHealthCheckId,
        },
        statistic: 'Minimum',
        period: Duration.minutes(1),
      }),
      threshold: 1,
      evaluationPeriods: 1,
      treatMissingData: TreatMissingData.BREACHING,
      alarmDescription: 'Alarm if the health check fails',
      alarmName: 'SimpleRoutingWebappHealthCheckAlarm',
    }).addAlarmAction(new SnsAction(alarmTopic));
  }
}