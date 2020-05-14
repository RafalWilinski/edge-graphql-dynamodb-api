#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { ServerlessGlobalGraphqlApiDynamodbStack } from '../lib/serverless-global-graphql-api-dynamodb-stack';

const app = new cdk.App();
new ServerlessGlobalGraphqlApiDynamodbStack(app, 'ServerlessGlobalGraphqlApiDynamodbStack');
