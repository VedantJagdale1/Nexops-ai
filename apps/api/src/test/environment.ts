import type { Environment } from '../config/env.js';

export const testEnvironment: Environment = {
  NODE_ENV: 'test',
  PORT: 4000,
  MONGODB_URI: 'mongodb://localhost:27017/nexops-test',
  CLIENT_URL: 'http://localhost:5173',
  ACCESS_TOKEN_SECRET: 'test-access-token-secret-that-is-at-least-32-chars',
  REFRESH_TOKEN_SECRET: 'test-refresh-token-secret-that-is-at-least-32-chars',
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '30d',
  COOKIE_SECRET: 'test-cookie-secret-that-is-at-least-32-characters',
  SMTP_PORT: 587,
  SMTP_FROM: 'NexOps AI <no-reply@nexops.local>',
  EMAIL_ENABLED: false,
  AI_PROVIDER: 'mock',
  STORAGE_PROVIDER: 'local',
  LOCAL_STORAGE_PATH: './uploads',
  LOG_LEVEL: 'silent',
};
