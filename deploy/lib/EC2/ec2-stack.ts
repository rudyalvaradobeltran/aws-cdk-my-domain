import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { 
  Vpc, 
  SubnetType, 
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
import * as path from 'path';
import * as fs from 'fs';

interface Ec2StackProps extends StackProps {
  VPC: Vpc;
  instances: Array<string>;
}

export class Ec2Stack extends Stack {
  constructor(scope: Construct, id: string, props: Ec2StackProps) {
    super(scope, id, props);

    const { VPC, instances } = props;

    // Create a security group for the EC2 instances
    const securityGroup = new SecurityGroup(this, 'WebServerSG', {
      vpc: VPC,
      description: 'Security group for web servers',
      allowAllOutbound: true,
    });

    // Allow HTTP traffic from anywhere
    securityGroup.addIngressRule(
      Peer.anyIpv4(),
      Port.tcp(80),
      'Allow HTTP traffic'
    );

    // Create an IAM role for the EC2 instances
    const role = new Role(this, 'WebServerRole', {
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

    const publicSubnet = VPC.selectSubnets({
      subnetGroupName: 'PublicSubnet',
    }).subnets[0];

    // Create EC2 instances in each private subnet
    instances.forEach((instance) => {
      new Instance(this, instance, {
        vpc: VPC,
        vpcSubnets: { subnets: [publicSubnet] },
        instanceType: InstanceType.of(
          InstanceClass.T3,
          InstanceSize.MICRO
        ),
        machineImage: MachineImage.latestAmazonLinux2023(),
        securityGroup: securityGroup,
        role: role,
        userData: userData,
        userDataCausesReplacement: true,
      });
    });
  }
}