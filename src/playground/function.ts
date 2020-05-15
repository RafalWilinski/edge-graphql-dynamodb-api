import lambdaPlayground from 'graphql-playground-middleware-lambda';

exports.playground = lambdaPlayground({
  endpoint: '/dev/graphql',
});
