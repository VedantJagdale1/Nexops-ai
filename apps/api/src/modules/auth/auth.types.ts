import type { User } from '../users/user.model.js';
import type { AuthenticatedUserDto, UserRole } from '@nexops/shared';
import type { HydratedDocument } from 'mongoose';

export interface RequestMetadata {
  ip?: string;
  userAgent?: string;
}

export interface AccessTokenClaims {
  userId: string;
  organisationId: string;
  role: UserRole;
}

export interface IssuedSession {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
  user: AuthenticatedUserDto;
}

export function toAuthenticatedUser(user: HydratedDocument<User>): AuthenticatedUserDto {
  return {
    id: user._id.toString(),
    organisationId: user.organisationId.toString(),
    ...(user.clientId ? { clientId: user.clientId.toString() } : {}),
    name: user.name,
    email: user.email,
    ...(user.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
    role: user.role,
    emailVerified: user.emailVerified,
  };
}
