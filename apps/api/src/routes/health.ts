import type { Health } from '@aerotrace/contracts';
import type { FastifyPluginAsync } from 'fastify';
import { SERVICE_VERSION } from '../version';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async (): Promise<Health> => {
    return {
      status: 'ok',
      service: 'aerotrace-api',
      version: SERVICE_VERSION,
      uptimeSeconds: Math.round(process.uptime()),
      time: new Date().toISOString(),
    };
  });
};
