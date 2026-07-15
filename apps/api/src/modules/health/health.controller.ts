import { getDatabaseHealth } from '../../infrastructure/database.js';

import type { Request, Response } from 'express';

export function getLiveness(_request: Request, response: Response): void {
  response.status(200).json({
    success: true,
    data: { status: 'ok', timestamp: new Date().toISOString() },
    meta: {},
  });
}

export function getReadiness(_request: Request, response: Response): void {
  const database = getDatabaseHealth();
  const isReady = database === 'connected' || process.env.NODE_ENV === 'test';

  response.status(isReady ? 200 : 503).json({
    success: isReady,
    data: { status: isReady ? 'ready' : 'unavailable', database },
    meta: {},
  });
}
