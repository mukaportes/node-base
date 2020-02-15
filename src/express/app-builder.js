require('../utils/correlation-id-handler').activate('correlation-id');
const bodyParser = require('body-parser');
const fastify = require('fastify');
const { createServer, proxy } = require('aws-serverless-express');
const { eventContext } = require('aws-serverless-express/middleware');
const expressContextMiddleware = require('../express/context-middleware');
const expressLoggingMiddleware = require('../express/logging-middleware');
const expressCorsMiddleware = require('./cors-middleware');

const NodeInspector = require('../development/node-inspector');

/**
 * The Express HTTP port for development mode
 */
const EXPRESS_PORT = process.env.EXPRESS_PORT || 3000;

/**
 * @private
 */
function expressToLambdaHandler(app) {
  const server = createServer(app);

  /* istanbul ignore next */
  return (event, context) => proxy(server, event, context);
}

/**
 * @private
 */
function expressToBodyParser(limit = '10mb') {
  const bodyParserOptions = { limit };

  return bodyParser.json(bodyParserOptions);
}

/**
 * @private
 */
function setupAppMiddlewares(app, options) {
  app.use(expressToBodyParser(options.bodyParserLimit));
  app.use(expressContextMiddleware);
  app.use(expressLoggingMiddleware);
  app.use(expressCorsMiddleware());

  /* istanbul ignore if */
  if (options.mode === 'lambda') app.use(eventContext());
}

/**
 * @private
 */
// NOTE: fastify.listen() is asynchronous; that's why the await was added
/* istanbul ignore next */
async function startApp(app) {
  const httpServer = await app.listen(EXPRESS_PORT);

  console.log(`Application listening on port ${EXPRESS_PORT}`); // eslint-disable-line no-console

  return httpServer;
}

/**
 * Function to initializes and configures an Express app
 * @param {object} options - accepts mode and developmentMode params
 * @return {object} a object with the expressApp,
 * start method to start the express and the handler function
 * to be the Lambda entrypoint
 */
module.exports = function expressAppBuilder(options = {}) {
  const app = fastify({ logger: true });

  setupAppMiddlewares(app, options);

  /* istanbul ignore if */
  if (options.developmentMode) new NodeInspector().start();

  return {
    handler: expressToLambdaHandler(app),
    start() {
      /* istanbul ignore next */
      return startApp(app);
    },
  };
};
