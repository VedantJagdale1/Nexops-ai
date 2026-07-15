import { describe, expect, it } from 'vitest';

import { testEnvironment } from '../../test/environment.js';

import { TokenService } from './token.service.js';

import type { AppError } from '../../common/errors/app-error.js';

describe('TokenService', () => {
  const service = new TokenService(testEnvironment);

  it('signs and verifies a scoped access token', () => {
    const token = service.signAccessToken({
      userId: 'user-1',
      organisationId: 'org-1',
      role: 'project_manager',
    });

    expect(service.verifyAccessToken(token)).toEqual({
      userId: 'user-1',
      organisationId: 'org-1',
      role: 'project_manager',
    });
  });

  it('rejects a modified access token', () => {
    const token = service.signAccessToken({
      userId: 'user-1',
      organisationId: 'org-1',
      role: 'owner',
    });
    expect(() => service.verifyAccessToken(`${token}changed`)).toThrowError(
      expect.objectContaining<Partial<AppError>>({ code: 'INVALID_ACCESS_TOKEN', statusCode: 401 }),
    );
  });

  it('creates opaque refresh tokens and stores only deterministic hashes', () => {
    const refresh = service.createRefreshToken('family-1');
    expect(refresh.raw).not.toBe(refresh.hash);
    expect(refresh.hash).toBe(service.hashToken(refresh.raw));
    expect(refresh.familyId).toBe('family-1');
    expect(refresh.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});
