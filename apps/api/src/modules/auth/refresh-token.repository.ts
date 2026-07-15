import { RefreshTokenModel } from './refresh-token.model.js';

import type { RefreshToken } from './refresh-token.model.js';
import type { RefreshTokenMaterial, TokenService } from './token.service.js';
import type { HydratedDocument } from 'mongoose';

export interface StoreRefreshTokenData extends RefreshTokenMaterial {
  organisationId: string;
  userId: string;
  createdByIp?: string;
  userAgent?: string;
}

export interface RefreshTokenRepositoryContract {
  create(data: StoreRefreshTokenData): Promise<void>;
  findByRawToken(rawToken: string): Promise<HydratedDocument<RefreshToken> | null>;
  consume(tokenHash: string, replacementHash: string, revokedByIp?: string): Promise<boolean>;
  revoke(tokenHash: string, revokedByIp?: string): Promise<void>;
  revokeFamily(userId: string, familyId: string, revokedByIp?: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
}

export class RefreshTokenRepository implements RefreshTokenRepositoryContract {
  public constructor(private readonly tokenService: TokenService) {}

  public async create(data: StoreRefreshTokenData): Promise<void> {
    await RefreshTokenModel.create({
      organisationId: data.organisationId,
      userId: data.userId,
      familyId: data.familyId,
      tokenHash: data.hash,
      expiresAt: data.expiresAt,
      ...(data.createdByIp ? { createdByIp: data.createdByIp } : {}),
      ...(data.userAgent ? { userAgent: data.userAgent } : {}),
    });
  }

  public async findByRawToken(rawToken: string): Promise<HydratedDocument<RefreshToken> | null> {
    return RefreshTokenModel.findOne({ tokenHash: this.tokenService.hashToken(rawToken) })
      .select('+tokenHash +replacedByHash')
      .exec();
  }

  public async consume(
    tokenHash: string,
    replacementHash: string,
    revokedByIp?: string,
  ): Promise<boolean> {
    const result = await RefreshTokenModel.updateOne(
      { tokenHash, revokedAt: { $exists: false }, expiresAt: { $gt: new Date() } },
      {
        $set: {
          revokedAt: new Date(),
          replacedByHash: replacementHash,
          ...(revokedByIp ? { revokedByIp } : {}),
        },
      },
    );
    return result.modifiedCount === 1;
  }

  public async revoke(tokenHash: string, revokedByIp?: string): Promise<void> {
    await RefreshTokenModel.updateOne(
      { tokenHash, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date(), ...(revokedByIp ? { revokedByIp } : {}) } },
    );
  }

  public async revokeFamily(userId: string, familyId: string, revokedByIp?: string): Promise<void> {
    await RefreshTokenModel.updateMany(
      { userId, familyId, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date(), ...(revokedByIp ? { revokedByIp } : {}) } },
    );
  }

  public async revokeAllForUser(userId: string): Promise<void> {
    await RefreshTokenModel.updateMany(
      { userId, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } },
    );
  }
}
