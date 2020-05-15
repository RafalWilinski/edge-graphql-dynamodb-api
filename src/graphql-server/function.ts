import { ApolloServer, gql } from 'apollo-server';

const typeDefs = gql`
  type Query {
    hello: String
  }
`;

const resolvers = {
  Query: {
    hello: () => 'Hello world.',
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  playground: {
    endpoint: '/dev/graphql',
  },
  context: ({ event, context }: any) => {
    console.log('event', JSON.stringify(event, null, 2));

    return {
      headers: event.headers,
      functionName: context.functionName,
      event,
      context,
    };
  },
});

console.log('GraphQL Server:', { server });

exports.handler = (event: any, context: any, callback: any) => {
  console.log('req: ', JSON.stringify(event), context);

  // server.executeOperation()
  const status = '200';
  const headers = {
    'content-type': [
      {
        key: 'Content-Type',
        value: 'application/json',
      },
    ],
  };
  const body = JSON.stringify(event, null, 2);
  return callback(null, { status, headers, body });
};
