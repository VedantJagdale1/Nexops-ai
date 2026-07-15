import pino from 'pino';

import type { Environment } from './env.js';

export function createLogger(environment: Pick<Environment, 'LOG_LEVEL' | 'NODE_ENV'>) {
  return pino({
    level: environment.LOG_LEVEL,
    base: { service: 'nexops-api' },
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'password',
        'passwordHash',
        'accessToken',
        'refreshToken',
        '*.password',
        '*.token',
      ],
      censor: '[REDACTED]',
    },
    ...(environment.NODE_ENV === 'test' ? { enabled: false } : {}),
  });
}

export type AppLogger = ReturnType<typeof createLogger>;
