import { buildApp } from './app/build-app.js';

const app = await buildApp();

try {
  await app.listen({
    host: '0.0.0.0',
    port: app.config.PORT,
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
