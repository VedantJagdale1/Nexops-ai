import type { Environment } from '../../config/env.js';
import type { Request, Response } from 'express';

const refreshCookieName = 'nexops_refresh';

export function readRefreshCookie(request: Request): string | undefined {
  const cookies = request.signedCookies as unknown;
  if (!cookies || typeof cookies !== 'object') return undefined;
  const value = Reflect.get(cookies, refreshCookieName) as unknown;
  return typeof value === 'string' ? value : undefined;
}

export function setRefreshCookie(
  response: Response,
  token: string,
  expiresAt: Date,
  environment: Pick<Environment, 'NODE_ENV'>,
): void {
  response.cookie(refreshCookieName, token, {
    expires: expiresAt,
    httpOnly: true,
    path: '/api/v1',
    sameSite: 'lax',
    secure: environment.NODE_ENV === 'production',
    signed: true,
  });
}

export function clearRefreshCookie(
  response: Response,
  environment: Pick<Environment, 'NODE_ENV'>,
): void {
  response.clearCookie(refreshCookieName, {
    httpOnly: true,
    path: '/api/v1',
    sameSite: 'lax',
    secure: environment.NODE_ENV === 'production',
    signed: true,
  });
}
