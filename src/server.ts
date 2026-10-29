import { app } from './app.js';
import { env } from './config/env.js';
import { closeDb } from './db/index.js';
import { logger } from './lib/logger.js';

const server = app.listen(env.PORT, () => {
  logger.info(`HomeWise API listening on http://localhost:${env.PORT}`);
});

function shutdown() {
  server.close(async () => {
    await closeDb();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
