import bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { beforeEach, describe, expect, it } from 'vitest';

import { testEnvironment } from '../../test/environment.js';
import { OrganisationModel } from '../organisations/organisation.model.js';
import { UserModel } from '../users/user.model.js';

import { AuthService } from './auth.service.js';
import { RefreshTokenModel } from './refresh-token.model.js';
import { TokenService } from './token.service.js';

import type { AccountToken } from './account-token.model.js';
import type { AccountTokenRepositoryContract } from './account-token.repository.js';
import type { RefreshToken } from './refresh-token.model.js';
import type {
  RefreshTokenRepositoryContract,
  StoreRefreshTokenData,
} from './refresh-token.repository.js';
import type { AppError } from '../../common/errors/app-error.js';
import type { EmailService } from '../../infrastructure/email/email.service.js';
import type { Organisation } from '../organisations/organisation.model.js';
import type {
  CreateOrganisationData,
  OrganisationRepositoryContract,
} from '../organisations/organisation.repository.js';
import type { User } from '../users/user.model.js';
import type { CreateUserData, UserRepositoryContract } from '../users/user.repository.js';
import type { HydratedDocument } from 'mongoose';

class MemoryOrganisations implements OrganisationRepositoryContract {
  public records: Array<HydratedDocument<Organisation>> = [];
  public async create(data: CreateOrganisationData): Promise<HydratedDocument<Organisation>> {
    const record = new OrganisationModel(data);
    this.records.push(record);
    return record;
  }
  public async deleteById(id: string): Promise<void> {
    this.records = this.records.filter((record) => record.id !== id);
  }
  public async findById(id: string): Promise<HydratedDocument<Organisation> | null> {
    return this.records.find((record) => record.id === id) ?? null;
  }
  public async slugExists(slug: string): Promise<boolean> {
    return this.records.some((record) => record.slug === slug);
  }
}

class MemoryUsers implements UserRepositoryContract {
  public membersBelongToOrganisation(): Promise<boolean> {
    return Promise.resolve(true);
  }
  public records: Array<HydratedDocument<User>> = [];
  public async create(data: CreateUserData): Promise<HydratedDocument<User>> {
    const record = new UserModel(data);
    this.records.push(record);
    return record;
  }
  public async deleteById(id: string): Promise<void> {
    this.records = this.records.filter((record) => record.id !== id);
  }
  public async emailExists(email: string): Promise<boolean> {
    return this.records.some((record) => record.email === email);
  }
  public async findByEmailWithPassword(email: string): Promise<HydratedDocument<User> | null> {
    return this.records.find((record) => record.email === email) ?? null;
  }
  public async findById(id: string): Promise<HydratedDocument<User> | null> {
    return this.records.find((record) => record.id === id) ?? null;
  }
  public async markLogin(id: string, date: Date): Promise<void> {
    const user = await this.findById(id);
    if (user) user.lastLoginAt = date;
  }
  public async updatePassword(id: string, passwordHash: string): Promise<void> {
    const user = await this.findById(id);
    if (user) user.passwordHash = passwordHash;
  }
  public async verifyEmail(id: string): Promise<void> {
    const user = await this.findById(id);
    if (user) user.emailVerified = true;
  }
}

class MemoryRefreshTokens implements RefreshTokenRepositoryContract {
  public records: Array<HydratedDocument<RefreshToken>> = [];
  public constructor(private readonly tokens: TokenService) {}
  public async create(data: StoreRefreshTokenData): Promise<void> {
    this.records.push(
      new RefreshTokenModel({
        organisationId: data.organisationId,
        userId: data.userId,
        familyId: data.familyId,
        tokenHash: data.hash,
        expiresAt: data.expiresAt,
      }),
    );
  }
  public async findByRawToken(rawToken: string): Promise<HydratedDocument<RefreshToken> | null> {
    return (
      this.records.find((record) => record.tokenHash === this.tokens.hashToken(rawToken)) ?? null
    );
  }
  public async consume(hash: string, replacement: string): Promise<boolean> {
    const record = this.records.find((item) => item.tokenHash === hash && !item.revokedAt);
    if (!record) return false;
    record.revokedAt = new Date();
    record.replacedByHash = replacement;
    return true;
  }
  public async revoke(hash: string): Promise<void> {
    const record = this.records.find((item) => item.tokenHash === hash);
    if (record) record.revokedAt = new Date();
  }
  public async revokeFamily(userId: string, familyId: string): Promise<void> {
    this.records
      .filter((item) => item.userId.toString() === userId && item.familyId === familyId)
      .forEach((item) => {
        item.revokedAt = new Date();
      });
  }
  public async revokeAllForUser(userId: string): Promise<void> {
    this.records
      .filter((item) => item.userId.toString() === userId)
      .forEach((item) => {
        item.revokedAt = new Date();
      });
  }
}

class MemoryAccountTokens implements AccountTokenRepositoryContract {
  public records: AccountToken[] = [];
  public async create(data: {
    organisationId: string;
    userId: string;
    type: AccountToken['type'];
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    this.records.push({
      ...data,
      organisationId: new Types.ObjectId(data.organisationId),
      userId: new Types.ObjectId(data.userId),
      createdAt: new Date(),
    });
  }
  public async consume(): Promise<AccountToken | null> {
    return null;
  }
}

const email: EmailService = {
  sendEmailVerification: async () => undefined,
  sendPasswordReset: async () => undefined,
  sendInvitation: async () => undefined,
};

describe('AuthService', () => {
  let organisations: MemoryOrganisations;
  let users: MemoryUsers;
  let refreshTokens: MemoryRefreshTokens;
  let service: AuthService;

  beforeEach(() => {
    organisations = new MemoryOrganisations();
    users = new MemoryUsers();
    const tokens = new TokenService(testEnvironment);
    refreshTokens = new MemoryRefreshTokens(tokens);
    service = new AuthService(
      organisations,
      users,
      refreshTokens,
      new MemoryAccountTokens(),
      tokens,
      email,
    );
  });

  it('registers an isolated organisation owner with a hashed password and session', async () => {
    const session = await service.register(
      {
        organisationName: 'Northstar Digital',
        name: 'Maya Shah',
        email: 'maya@northstar.test',
        password: 'Strong!Pass123',
        timezone: 'Asia/Kolkata',
      },
      { ip: '127.0.0.1' },
    );

    expect(organisations.records).toHaveLength(1);
    expect(users.records[0]?.organisationId.toString()).toBe(organisations.records[0]?.id);
    expect(users.records[0]?.role).toBe('owner');
    expect(await bcrypt.compare('Strong!Pass123', users.records[0]?.passwordHash ?? '')).toBe(true);
    expect(session.user.email).toBe('maya@northstar.test');
    expect(session.refreshToken).toBeTruthy();
    expect(refreshTokens.records).toHaveLength(1);
  });

  it('logs in an active user and rejects an incorrect password without revealing account state', async () => {
    const organisationId = new Types.ObjectId();
    await users.create({
      organisationId: organisationId.toString(),
      name: 'Maya Shah',
      email: 'maya@northstar.test',
      passwordHash: await bcrypt.hash('Strong!Pass123', 4),
      role: 'owner',
      status: 'active',
      emailVerified: true,
    });

    const session = await service.login(
      { email: 'maya@northstar.test', password: 'Strong!Pass123' },
      {},
    );
    expect(session.user.organisationId).toBe(organisationId.toString());

    await expect(
      service.login({ email: 'maya@northstar.test', password: 'wrong' }, {}),
    ).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
      statusCode: 401,
    } satisfies Partial<AppError>);
  });

  it('rotates a refresh token and makes the prior token unusable', async () => {
    const registered = await service.register(
      {
        organisationName: 'Northstar Digital',
        name: 'Maya Shah',
        email: 'maya@northstar.test',
        password: 'Strong!Pass123',
        timezone: 'UTC',
      },
      {},
    );
    const rotated = await service.refresh(registered.refreshToken, {});

    expect(rotated.refreshToken).not.toBe(registered.refreshToken);
    expect(refreshTokens.records[0]?.revokedAt).toBeInstanceOf(Date);
    await expect(service.refresh(registered.refreshToken, {})).rejects.toMatchObject({
      code: 'REFRESH_TOKEN_REUSE',
      statusCode: 401,
    } satisfies Partial<AppError>);
  });
});
