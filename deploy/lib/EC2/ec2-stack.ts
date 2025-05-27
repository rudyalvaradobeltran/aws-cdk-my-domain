import { Stack, StackProps, CfnOutput, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { 
  Vpc,
  SecurityGroup,
  Peer,
  Port,
  Instance,
  InstanceType,
  InstanceClass,
  InstanceSize,
  MachineImage,
  UserData,
} from 'aws-cdk-lib/aws-ec2';
import { Role, ServicePrincipal, ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import { 
  ApplicationLoadBalancer,
  ApplicationProtocol,
  ApplicationTargetGroup,
  TargetType,
  ListenerAction,
  IpAddressType
} from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { InstanceTarget } from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
import * as path from 'path';
import * as fs from 'fs';

interface Ec2StackProps extends StackProps {
  VPC: Vpc;
  instances: Array<string>;
  region: string;
}

export class Ec2Stack extends Stack {
  constructor(scope: Construct, id: string, props: Ec2StackProps) {
    super(scope, id, props);

    const { VPC, instances, region } = props;

    // Create a security group for the EC2 instances
    const instanceSecurityGroup = new SecurityGroup(this, `WebServerSG-${region}`, {
      vpc: VPC,
      description: 'Security group for web servers',
      allowAllOutbound: true,
    });

    // Allow HTTP traffic from ALB only
    instanceSecurityGroup.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(80),
      'Allow HTTP traffic from ALB'
    );

    // Create a security group for the ALB
    const albSecurityGroup = new SecurityGroup(this, `AlbSG-${region}`, {
      vpc: VPC,
      description: 'Security group for ALB',
      allowAllOutbound: true,
    });

    // Allow HTTP traffic from anywhere to ALB
    albSecurityGroup.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(80),
      'Allow HTTP traffic from anywhere'
    );

    // Create an IAM role for the EC2 instances
    const role = new Role(this, `WebServerRole-${region}`, {
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
    });

    // Add necessary managed policies
    role.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')
    );

    // Read the user data script
    const userDataScript = fs.readFileSync(
      path.join(__dirname, '../../script/instance-init.sh'),
      'utf8'
    );

    // Create the user data
    const userData = UserData.forLinux();
    userData.addCommands(userDataScript);

    // Create EC2 instances in private subnets
    const instanceTargets = instances.map((instance) => {
      const ec2Instance = new Instance(this, `${instance}-${region}`, {
        vpc: VPC,
        vpcSubnets: {
          subnetGroupName: 'PrivateSubnet',
        },
        instanceType: InstanceType.of(
          InstanceClass.T3,
          InstanceSize.MICRO
        ),
        machineImage: MachineImage.latestAmazonLinux2023(),
        securityGroup: instanceSecurityGroup,
        role: role,
        userData: userData,
        userDataCausesReplacement: true,
      });

      return new InstanceTarget(ec2Instance);
    });

    // Create an Application Load Balancer
    const alb = new ApplicationLoadBalancer(this, `WebServerALB-${region}`, {
      vpc: VPC,
      internetFacing: true,
      securityGroup: albSecurityGroup,
      vpcSubnets: {
        subnetGroupName: 'PublicSubnet',
      },
      ipAddressType: IpAddressType.IPV4,
    });

    // Create a target group
    const targetGroup = new ApplicationTargetGroup(this, `WebServerTargetGroup-${region}`, {
      vpc: VPC,
      port: 80,
      protocol: ApplicationProtocol.HTTP,
      targetType: TargetType.INSTANCE,
      healthCheck: {
        path: '/',
        interval: Duration.seconds(30),
        timeout: Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
    });

    // Add instances to the target group
    instanceTargets.forEach(target => {
      targetGroup.addTarget(target);
    });

    // Add a listener to the ALB
    alb.addListener(`HttpListener-${region}`, {
      port: 80,
      defaultAction: ListenerAction.forward([targetGroup]),
    });

    // Output the ALB DNS name
    new CfnOutput(this, `LoadBalancerDNS-${region}`, {
      value: alb.loadBalancerDnsName,
      description: `The DNS name of the load balancer in ${region}`,
    });
  }
}