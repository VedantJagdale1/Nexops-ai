import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { userRoles } from '@nexops/shared';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

import { AppError } from '../../common/errors/app-error.js';
import { durationToMilliseconds } from '../../common/utils/duration.js';

import type { AccessTokenClaims } from './auth.types.js';
import type { Environment } from '../../config/env.js';
import type { SignOptions } from 'jsonwebtoken';

const accessTokenPayloadSchema = z.object({
  sub: z.string().min(1),
  organisationId: z.string().min(1),
  role: z.enum(userRoles),
  type: z.literal('access'),
});

export interface RefreshTokenMaterial {
  raw: string;
  hash: string;
  familyId: string;
  expiresAt: Date;
}

export class TokenService {
  public constructor(
    private readonly configuration: Pick<
      Environment,
      'ACCESS_TOKEN_SECRET' | 'ACCESS_TOKEN_EXPIRY' | 'REFRESH_TOKEN_EXPIRY'
    >,
  ) {}

  public signAccessToken(claims: AccessTokenClaims): string {
    return jwt.sign(
      {
        organisationId: claims.organisationId,
        role: claims.role,
        type: 'access',
      },
      this.configuration.ACCESS_TOKEN_SECRET,
      {
        audience: 'nexops-web',
        expiresIn: this.configuration.ACCESS_TOKEN_EXPIRY as NonNullable<SignOptions['expiresIn']>,
        issuer: 'nexops-api',
        jwtid: randomUUID(),
        subject: claims.userId,
      },
    );
  }

  public verifyAccessToken(token: string): AccessTokenClaims {
    try {
      const payload = jwt.verify(token, this.configuration.ACCESS_TOKEN_SECRET, {
        audience: 'nexops-web',
        issuer: 'nexops-api',
      });
      const parsed = accessTokenPayloadSchema.parse(payload);
      return {
        userId: parsed.sub,
        organisationId: parsed.organisationId,
        role: parsed.role,
      };
    } catch (error) {
      throw new AppError({
        code: 'INVALID_ACCESS_TOKEN',
        message: 'The access token is invalid or expired',
        statusCode: 401,
        cause: error,
      });
    }
  }

  public createRefreshToken(familyId: string = randomUUID()): RefreshTokenMaterial {
    const raw = randomBytes(48).toString('base64url');
    return {
      raw,
      hash: this.hashToken(raw),
      familyId,
      expiresAt: new Date(
        Date.now() + durationToMilliseconds(this.configuration.REFRESH_TOKEN_EXPIRY),
      ),
    };
  }

  public createAccountToken(): { raw: string; hash: string } {
    const raw = randomBytes(40).toString('base64url');
    return { raw, hash: this.hashToken(raw) };
  }

  public hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
