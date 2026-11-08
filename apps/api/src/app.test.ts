import { HealthSchema, ApiErrorSchema } from '@aerotrace/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from './app';
import { loadConfig } from './config';

describe('API shell', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp(loadConfig({ NODE_ENV: 'test', LOG_LEVEL: 'silent' }));
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health returns status and version', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/health' });
    expect(response.statusCode).toBe(200);
    const health = HealthSchema.parse(response.json());
    expect(health.status).toBe('ok');
    expect(health.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('unknown routes return the shared error shape', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/nope' });
    expect(response.statusCode).toBe(404);
    expect(ApiErrorSchema.parse(response.json()).error.code).toBe('not_found');
  });
});

describe('loadConfig', () => {
  it('applies defaults', () => {
    const config = loadConfig({});
    expect(config.PORT).toBe(3000);
    expect(config.DEMO_MODE).toBe(false);
  });

  it('rejects an invalid port with a readable message', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(/PORT/);
  });

  it('refuses demo mode in production', () => {
    expect(() => loadConfig({ NODE_ENV: 'production', DEMO_MODE: 'true' })).toThrow(/DEMO_MODE/);
  });
});
