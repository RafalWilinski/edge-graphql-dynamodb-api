// exports.handler = (event: any, context: any, callback: any) => {
//   console.log('REQUEST', JSON.stringify(event), context);

//   const status = '200';
//   const headers = {
//     'content-type': [
//       {
//         key: 'Content-Type',
//         value: 'application/json',
//       },
//     ],
//   };

//   const body = JSON.stringify(event, null, 2);
//   return callback(null, { status, headers, body });
// };

import { ApolloServer, gql } from 'apollo-server-lambda-edge';

const typeDefs = gql`
  type Query {
    hello: String
  }
`;

const resolvers = {
  Query: {
    hello: () => 'Hello world!',
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  playground: {
    endpoint: '/dev/graphql',
  },
  context: ({ event, context }: any) => {
    console.log(event);

    return {
      headers: event.headers,
      functionName: context.functionName,
      event,
      context,
    };
  },
});

console.log('GraphQL Server:', { server });

exports.handler = server.createHandler({
  cors: {
    origin: '*',
    credentials: true,
  },
});
