import { graphql } from 'graphql';
import { CloudFrontRequestEvent, Context, CloudFrontResponseCallback } from 'aws-lambda';
import { GraphQLSchema, GraphQLObjectType, GraphQLString } from 'graphql';
import { replicationRegions } from '../../dynamoDBRegions';

const { DynamoDB, STS } = eval(`require('aws-sdk');`); // Do not pack with Parcel. I know, it's ugly.

const edgeRegion = new STS().config.region;
let region = replicationRegions[0];

if (replicationRegions.includes(edgeRegion)) {
  region = edgeRegion;
}

const ddb = new DynamoDB.DocumentClient({
  region,
});

export const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'RootQueryType',
    fields: {
      hello: {
        type: GraphQLString,
        resolve() {
          return ddb
            .scan({
              TableName:
                'ServerlessGlobalGraphqlApiDynamodbStack-globdynamodb00ADB51B-M0578CQMZCP9',
            })
            .promise()
            .then((data: any) => {
              console.log('db', { data });

              return JSON.stringify(data, null, 2);
            })
            .catch((error: any) => {
              console.log({ error });
              return JSON.stringify(error, null, 2);
            });
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

  if (!request.body) {
    return callback(null, { status: '400', body: 'Request body is missing' });
  }

  const buf = new Buffer(request.body.data as any, 'base64');
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
