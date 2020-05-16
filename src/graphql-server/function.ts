import { graphql, GraphQLList } from 'graphql';
import { CloudFrontRequestEvent, Context, CloudFrontResponseCallback } from 'aws-lambda';
import { GraphQLSchema, GraphQLObjectType, GraphQLString } from 'graphql';
import { replicationRegions } from '../../dynamoDBRegions';

const { DynamoDB, STS } = eval(`require('aws-sdk');`); // Do not pack with Parcel. I know, it's ugly.

let region = replicationRegions[0];
const edgeRegion = new STS().config.region;
const TableName = 'ServerlessGlobalGraphqlApiDynamodbStack-globdynamodb00ADB51B-M0578CQMZCP9';

if (replicationRegions.includes(edgeRegion)) {
  region = edgeRegion;
}

const ddb = new DynamoDB.DocumentClient({
  region,
});

const item = new GraphQLObjectType({
  name: 'Item',
  fields: {
    id: {
      type: GraphQLString,
    },
    description: {
      type: GraphQLString,
    },
  },
});

export const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'RootQueryType',
    fields: {
      item: {
        type: item,
        args: {
          id: {
            type: GraphQLString,
          },
        },
        resolve(root: any, context: any, args: any) {
          return ddb
            .get({
              TableName,
              Key: {
                hashKey: args.id,
              },
            })
            .promise()
            .then((data: any) => data)
            .catch((error: any) => error);
        },
      },
      items: {
        type: new GraphQLList(item),
        resolve() {
          return ddb
            .scan({
              TableName,
            })
            .promise()
            .then((data: any) => data.Items)
            .catch((error: any) => error);
        },
      },
    },
  }),
});

const headers = {
  'content-type': [
    {
      key: 'Content-Type',
      value: 'application/json',
    },
  ],
};

exports.handler = (
  event: CloudFrontRequestEvent,
  context: Context,
  callback: CloudFrontResponseCallback
) => {
  console.log('request: ', { event: JSON.stringify(event), context });

  const request = event.Records[0].cf.request;

  if (request.uri === '/playground') {
    request.uri = '/playground.html';

    return callback(null, request as any);
  }

  const buf = new Buffer(request.body!.data as any, 'base64');
  const body = JSON.parse(buf.toString());
  const query = body.query || '{ hello }';

  graphql(schema, query, undefined, undefined, body.variables, body.operationName).then(
    (result) => {
      console.log('GraphQL Result', { result });

      const body = JSON.stringify(result, null, 2);

      return callback(null, { status: '200', headers, body });
    }
  );
};
