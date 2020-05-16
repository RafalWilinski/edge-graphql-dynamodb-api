import * as cdk from '@aws-cdk/core';
import { AttributeType, Table } from '@aws-cdk/aws-dynamodb';
import { Bucket } from '@aws-cdk/aws-s3';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { CompositePrincipal, Role, ServicePrincipal } from '@aws-cdk/aws-iam';
import {
  CloudFrontWebDistribution,
  LambdaEdgeEventType,
  CloudFrontAllowedMethods,
  OriginAccessIdentity,
} from '@aws-cdk/aws-cloudfront';
import { ManagedPolicy } from '@aws-cdk/aws-iam';
import sha256 from 'sha256-file';
import { CfnOutput, Duration } from '@aws-cdk/core';
import { replicationRegions } from '../dynamoDBRegions';

export class ServerlessGlobalGraphqlApiDynamodbStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new Table(this, 'globdynamodb', {
      partitionKey: { name: 'hashKey', type: AttributeType.STRING },
      replicationRegions,
    });

    const bucket = new Bucket(this, 'bucket', {
      publicReadAccess: true,
      websiteIndexDocument: 'playground.html',
    });

    const graphql = new NodejsFunction(this, 'yourlambda', {
      entry: './src/graphql-server/dist/function.js',
      handler: 'handler',
      memorySize: 128, // Max
      minify: true, // To fit below 1MB code limit
      timeout: Duration.millis(5000), // Max
      role: new Role(this, 'AllowLambdaServiceToAssumeRole', {
        assumedBy: new CompositePrincipal(
          new ServicePrincipal('lambda.amazonaws.com'),
          new ServicePrincipal('edgelambda.amazonaws.com')
        ),
        managedPolicies: [
          ManagedPolicy.fromManagedPolicyArn(
            this,
            'gql-server-managed-policy',
            'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
          ),
        ],
      }),
    });

    table.grantFullAccess(graphql);

    const graphqlVersion = graphql.addVersion(
      ':sha256:' + sha256('./src/graphql-server/function.ts')
    );

    const distribution = new CloudFrontWebDistribution(this, 'MyDistribution', {
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: bucket,
            originAccessIdentity: new OriginAccessIdentity(this, 'cloudfront-oai'),
          },
          behaviors: [
            {
              isDefaultBehavior: true,
              allowedMethods: CloudFrontAllowedMethods.ALL,
              lambdaFunctionAssociations: [
                {
                  eventType: LambdaEdgeEventType.VIEWER_REQUEST,
                  lambdaFunction: graphqlVersion,
                },
              ],
            },
          ],
        },
      ],
    });

    // Include body = true
    // (distribution.node.defaultChild as CfnDistribution).addOverride(
    //   'Properties.DistributionConfig.CacheBehaviors.0.LambdaFunctionAssociations.0.IncludeBody',
    //   true
    // );

    new CfnOutput(this, 'apiUrl', {
      value: distribution.domainName,
    });

    new CfnOutput(this, 'sourceBucket', {
      value: bucket.bucketName,
    });
  }
}
