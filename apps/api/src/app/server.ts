import { buildApp } from './app.js';
import { env } from '../config/env.js';

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info(`🚀 API running on http://0.0.0.0:${env.PORT}`);
  } catch (err) {
    app.log.error(err, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  const app = await buildApp();
  await app.close();
  process.exit(0);
});

start();
