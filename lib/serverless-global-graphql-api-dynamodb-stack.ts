import * as cdk from '@aws-cdk/core';
import { AttributeType, Table } from '@aws-cdk/aws-dynamodb';
import { Bucket } from '@aws-cdk/aws-s3';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { CompositePrincipal, Role, ServicePrincipal } from '@aws-cdk/aws-iam';
import { LambdaRestApi } from '@aws-cdk/aws-apigateway';
import {
  CloudFrontWebDistribution,
  LambdaEdgeEventType,
  CloudFrontAllowedMethods,
  OriginAccessIdentity,
} from '@aws-cdk/aws-cloudfront';
import { ManagedPolicy } from '@aws-cdk/aws-iam';
import sha256 from 'sha256-file';
import { CfnOutput, Duration } from '@aws-cdk/core';

export class ServerlessGlobalGraphqlApiDynamodbStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new Table(this, 'globdynamodb', {
      partitionKey: { name: 'hashKey', type: AttributeType.STRING },
      replicationRegions: ['eu-central-1', 'ap-southeast-2'],
    });

    const bucket = new Bucket(this, 'bucket', {
      publicReadAccess: true,
    });

    const graphql = new NodejsFunction(this, 'yourlambda', {
      entry: './src/graphql-server/function.ts',
      handler: 'handler',
      memorySize: 1024,
      timeout: Duration.millis(10000),
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

    // const playground = new NodejsFunction(this, 'graphql-playground', {
    //   entry: './src/playground/function.ts',
    //   handler: 'playground',
    //   role: new Role(this, 'AllowPlaygroundLambdaServiceToAssumeRole', {
    //     assumedBy: new CompositePrincipal(
    //       new ServicePrincipal('lambda.amazonaws.com'),
    //       new ServicePrincipal('edgelambda.amazonaws.com')
    //     ),
    //     managedPolicies: [
    //       ManagedPolicy.fromManagedPolicyArn(
    //         this,
    //         'playground-managed-policy',
    //         'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
    //       ),
    //     ],
    //   }),
    // });
    // const playgroundApi = new LambdaRestApi(this, 'playground-api', {
    //   handler: playground,
    // });

    // const playgroundResource = playgroundApi.root.addResource('playground');
    // playgroundResource.addMethod('GET');
    // playgroundResource.addMethod('POST');
    // playgroundResource.addMethod('OPTIONS');

    new CfnOutput(this, 'apiUrl', {
      value: distribution.domainName,
    });

    new CfnOutput(this, 'sourceBucket', {
      value: bucket.bucketName,
    });
  }
}
