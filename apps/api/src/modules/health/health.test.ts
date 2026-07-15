import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { createLogger } from '../../config/logger.js';
import { testEnvironment } from '../../test/environment.js';

const logger = createLogger({ NODE_ENV: 'test', LOG_LEVEL: 'silent' });
const app = createApp({
  environment: testEnvironment,
  logger,
});

describe('health routes', () => {
  it('returns the standard success envelope for liveness', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: { status: 'ok' },
      meta: {},
    });
    expect(response.headers['x-request-id']).toBeTypeOf('string');
  });

  it('returns a traceable standard error for unknown routes', async () => {
    const response = await request(app).get('/api/v1/not-real');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'ROUTE_NOT_FOUND', details: [] },
    });
    expect(response.body.requestId).toBe(response.headers['x-request-id']);
  });
});
