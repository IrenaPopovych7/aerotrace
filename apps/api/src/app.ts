import Fastify, { type FastifyInstance } from 'fastify';
import type { Config } from './config';
import { registerErrorHandling } from './errors';
import { healthRoutes } from './routes/health';

/**
 * Builds the app without listening, so tests can use `app.inject()`.
 * Dependencies (config now; repositories and simulator later) are passed in here.
 */
export async function buildApp(config: Config): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      config.NODE_ENV === 'development'
        ? { level: config.LOG_LEVEL, transport: { target: 'pino-pretty' } }
        : { level: config.LOG_LEVEL },
    disableRequestLogging: false,
    genReqId: () => crypto.randomUUID(),
  });

  registerErrorHandling(app);
  await app.register(healthRoutes, { prefix: '/api/v1' });

  return app;
}
