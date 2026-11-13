'use strict';
const config = require('./config');
const { sequelize } = require('./models');
const { createApp } = require('./app');

async function main() {
  await sequelize.authenticate();
  console.log(`[db] connected (${sequelize.getDialect()})`);
  const app = createApp();
  const server = app.listen(config.port, () => {
    console.log(`[api] CampusFind API listening on :${config.port} (${config.env})`);
    console.log(`[api] Swagger UI: ${config.publicUrl}/api/docs`);
  });

  // Graceful shutdown (Kubernetes sends SIGTERM before killing the pod)
  const shutdown = (signal) => {
    console.log(`[api] ${signal} received, shutting down...`);
    server.close(async () => {
      await sequelize.close().catch(() => {});
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('[api] failed to start:', err.message);
  process.exit(1);
});
