import bcrypt from 'bcrypt';

import { AppError } from '../../common/errors/app-error.js';
import { createSlug } from '../../common/utils/slug.js';

import { toAuthenticatedUser } from './auth.types.js';

import type { AccountTokenRepositoryContract } from './account-token.repository.js';
import type { IssuedSession, RequestMetadata } from './auth.types.js';
import type { RefreshTokenRepositoryContract } from './refresh-token.repository.js';
import type { TokenService } from './token.service.js';
import type { EmailService } from '../../infrastructure/email/email.service.js';
import type { OrganisationRepositoryContract } from '../organisations/organisation.repository.js';
import type { UserRepositoryContract } from '../users/user.repository.js';
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterOrganisationInput,
  ResetPasswordInput,
} from '@nexops/shared';

const passwordRounds = 12;
const invalidPasswordHash = '$2b$12$jJhGBDiMm8y4Vh4v3.0y4e5VdULpCx4hYXQ.pWQ0cRsaVn4r6xXky';

export class AuthService {
  public constructor(
    private readonly organisations: OrganisationRepositoryContract,
    private readonly users: UserRepositoryContract,
    private readonly refreshTokens: RefreshTokenRepositoryContract,
    private readonly accountTokens: AccountTokenRepositoryContract,
    private readonly tokens: TokenService,
    private readonly email: EmailService,
  ) {}

  public async register(
    input: RegisterOrganisationInput,
    metadata: RequestMetadata,
  ): Promise<IssuedSession> {
    if (await this.users.emailExists(input.email)) {
      throw new AppError({
        code: 'EMAIL_ALREADY_REGISTERED',
        message: 'An account with this email already exists',
        statusCode: 409,
      });
    }

    const slug = await this.createUniqueSlug(input.organisationName);
    const organisation = await this.organisations.create({
      name: input.organisationName,
      slug,
      timezone: input.timezone,
    });

    let createdUserId: string | undefined;
    try {
      const user = await this.users.create({
        organisationId: organisation._id.toString(),
        name: input.name,
        email: input.email,
        passwordHash: await bcrypt.hash(input.password, passwordRounds),
        role: 'owner',
        status: 'active',
        emailVerified: false,
      });
      createdUserId = user._id.toString();
      await this.sendVerification(user._id.toString(), user.organisationId.toString(), user.email);
      return this.createSession(user, metadata);
    } catch (error) {
      if (createdUserId) await this.users.deleteById(createdUserId);
      await this.organisations.deleteById(organisation._id.toString());
      throw error;
    }
  }

  public async login(input: LoginInput, metadata: RequestMetadata): Promise<IssuedSession> {
    const user = await this.users.findByEmailWithPassword(input.email);
    const passwordMatches = await bcrypt.compare(
      input.password,
      user?.passwordHash ?? invalidPasswordHash,
    );

    if (!user || !passwordMatches) {
      throw new AppError({
        code: 'INVALID_CREDENTIALS',
        message: 'Email or password is incorrect',
        statusCode: 401,
      });
    }

    if (user.status !== 'active') {
      throw new AppError({
        code: 'ACCOUNT_UNAVAILABLE',
        message: 'This account is not active',
        statusCode: 403,
      });
    }

    await this.users.markLogin(user._id.toString(), new Date());
    return this.createSession(user, metadata);
  }

  public async refresh(rawToken: string, metadata: RequestMetadata): Promise<IssuedSession> {
    const existing = await this.refreshTokens.findByRawToken(rawToken);
    if (!existing) throw this.invalidRefreshToken();

    if (existing.revokedAt) {
      await this.refreshTokens.revokeFamily(
        existing.userId.toString(),
        existing.familyId,
        metadata.ip,
      );
      throw new AppError({
        code: 'REFRESH_TOKEN_REUSE',
        message: 'The session has been revoked because token reuse was detected',
        statusCode: 401,
      });
    }

    if (existing.expiresAt.getTime() <= Date.now()) throw this.invalidRefreshToken();

    const user = await this.users.findById(existing.userId.toString());
    if (!user || user.status !== 'active') throw this.invalidRefreshToken();

    const replacement = this.tokens.createRefreshToken(existing.familyId);
    const consumed = await this.refreshTokens.consume(
      existing.tokenHash,
      replacement.hash,
      metadata.ip,
    );
    if (!consumed) {
      await this.refreshTokens.revokeFamily(user._id.toString(), existing.familyId, metadata.ip);
      throw this.invalidRefreshToken();
    }

    await this.refreshTokens.create({
      ...replacement,
      organisationId: user.organisationId.toString(),
      userId: user._id.toString(),
      ...(metadata.ip ? { createdByIp: metadata.ip } : {}),
      ...(metadata.userAgent ? { userAgent: metadata.userAgent } : {}),
    });

    return {
      accessToken: this.tokens.signAccessToken({
        userId: user._id.toString(),
        organisationId: user.organisationId.toString(),
        role: user.role,
      }),
      refreshToken: replacement.raw,
      refreshExpiresAt: replacement.expiresAt,
      user: toAuthenticatedUser(user),
    };
  }

  public async logout(rawToken: string | undefined, metadata: RequestMetadata): Promise<void> {
    if (!rawToken) return;
    const existing = await this.refreshTokens.findByRawToken(rawToken);
    if (existing) await this.refreshTokens.revoke(existing.tokenHash, metadata.ip);
  }

  public async forgotPassword(input: ForgotPasswordInput): Promise<void> {
    const user = await this.users.findByEmailWithPassword(input.email);
    if (!user || user.status !== 'active') return;

    const token = this.tokens.createAccountToken();
    await this.accountTokens.create({
      organisationId: user.organisationId.toString(),
      userId: user._id.toString(),
      type: 'password_reset',
      tokenHash: token.hash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1_000),
    });
    await this.email.sendPasswordReset(user.email, token.raw);
  }

  public async resetPassword(input: ResetPasswordInput): Promise<void> {
    const token = await this.accountTokens.consume(input.token, 'password_reset');
    if (!token) {
      throw new AppError({
        code: 'INVALID_RESET_TOKEN',
        message: 'The password reset link is invalid or expired',
        statusCode: 400,
      });
    }

    await this.users.updatePassword(
      token.userId.toString(),
      await bcrypt.hash(input.password, passwordRounds),
    );
    await this.refreshTokens.revokeAllForUser(token.userId.toString());
  }

  public async verifyEmail(rawToken: string): Promise<void> {
    const token = await this.accountTokens.consume(rawToken, 'email_verification');
    if (!token) {
      throw new AppError({
        code: 'INVALID_VERIFICATION_TOKEN',
        message: 'The verification link is invalid or expired',
        statusCode: 400,
      });
    }
    await this.users.verifyEmail(token.userId.toString());
  }

  public async createSession(
    user: Awaited<ReturnType<UserRepositoryContract['create']>>,
    metadata: RequestMetadata,
  ): Promise<IssuedSession> {
    const refresh = this.tokens.createRefreshToken();
    await this.refreshTokens.create({
      ...refresh,
      organisationId: user.organisationId.toString(),
      userId: user._id.toString(),
      ...(metadata.ip ? { createdByIp: metadata.ip } : {}),
      ...(metadata.userAgent ? { userAgent: metadata.userAgent } : {}),
    });

    return {
      accessToken: this.tokens.signAccessToken({
        userId: user._id.toString(),
        organisationId: user.organisationId.toString(),
        role: user.role,
      }),
      refreshToken: refresh.raw,
      refreshExpiresAt: refresh.expiresAt,
      user: toAuthenticatedUser(user),
    };
  }

  private async sendVerification(
    userId: string,
    organisationId: string,
    email: string,
  ): Promise<void> {
    const token = this.tokens.createAccountToken();
    await this.accountTokens.create({
      organisationId,
      userId,
      type: 'email_verification',
      tokenHash: token.hash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1_000),
    });
    await this.email.sendEmailVerification(email, token.raw);
  }

  private async createUniqueSlug(name: string): Promise<string> {
    const base = createSlug(name) || 'organisation';
    if (!(await this.organisations.slugExists(base))) return base;

    for (let suffix = 2; suffix <= 100; suffix += 1) {
      const candidate = `${base}-${suffix}`;
      if (!(await this.organisations.slugExists(candidate))) return candidate;
    }
    throw new AppError({
      code: 'ORGANISATION_SLUG_UNAVAILABLE',
      message: 'Unable to allocate an organisation identifier',
      statusCode: 409,
    });
  }

  private invalidRefreshToken(): AppError {
    return new AppError({
      code: 'INVALID_REFRESH_TOKEN',
      message: 'The refresh token is invalid or expired',
      statusCode: 401,
    });
  }
}
