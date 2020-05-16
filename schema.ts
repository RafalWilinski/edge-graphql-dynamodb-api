import { GraphQLSchema, GraphQLObjectType, GraphQLString } from 'graphql';
import { DynamoDB } from 'aws-sdk';

const ddb = new DynamoDB.DocumentClient();

export const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'RootQueryType',
    fields: {
      hello: {
        type: GraphQLString,
        async resolve() {
          const data = await ddb
            .scan({
              TableName:
                'ServerlessGlobalGraphqlApiDynamodbStack-globdynamodb00ADB51B-M0578CQMZCP9',
            })
            .promise();

          return JSON.stringify(data, null, 2);
        },
      },
    },
  }),
});
