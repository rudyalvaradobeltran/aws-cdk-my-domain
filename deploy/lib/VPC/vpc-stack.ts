import { Stack, StackProps } from "aws-cdk-lib";
import {
  Vpc,
  IpAddresses,
  SubnetType,
  NetworkAcl,
  AclCidr,
  AclTraffic,
  TrafficDirection,
  Action
} from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

export class VpcStack extends Stack {
  public readonly VPC: Vpc;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const VPC = new Vpc(this, "VPC", {
      vpcName: "VPC",
      ipAddresses: IpAddresses.cidr("10.0.0.0/16"),
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "PublicSubnet",
          subnetType: SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: "PrivateSubnet",
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    const NACL = new NetworkAcl(this, 'NACL', {
      vpc: VPC,
      subnetSelection: { subnetType: SubnetType.PUBLIC },
    });

    // Allow all inbound traffic
    NACL.addEntry('AllowAllInbound', {
      ruleNumber: 100,
      cidr: AclCidr.anyIpv4(),
      traffic: AclTraffic.allTraffic(),
      direction: TrafficDirection.INGRESS,
      ruleAction: Action.ALLOW,
    });

    // Allow all outbound traffic
    NACL.addEntry('AllowAllOutbound', {
      ruleNumber: 100,
      cidr: AclCidr.anyIpv4(),
      traffic: AclTraffic.allTraffic(),
      direction: TrafficDirection.EGRESS,
      ruleAction: Action.ALLOW,
    });

    this.VPC = VPC;
  }
}
