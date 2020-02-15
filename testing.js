const { Express: { appBuilder } } = require('.');

const app = appBuilder({ limit: '50mb' });

app.port = 3000;
app.start()
  .then(() => console.log(`Fastify app is litening on port ${app.port || process.env.APP_PORT}`))
  .catch(error => console.error('Fastify app failed to start', error));
