import { createEmailService } from '../../infrastructure/email/email.service.js';
import { OrganisationRepository } from '../organisations/organisation.repository.js';
import { UserRepository } from '../users/user.repository.js';

import { AccountTokenRepository } from './account-token.repository.js';
import { AuthService } from './auth.service.js';
import { RefreshTokenRepository } from './refresh-token.repository.js';
import { TokenService } from './token.service.js';

import type { Environment } from '../../config/env.js';
import type { AppLogger } from '../../config/logger.js';

export function createIdentityDependencies(environment: Environment, logger: AppLogger) {
  const tokenService = new TokenService(environment);
  const userRepository = new UserRepository();
  const organisationRepository = new OrganisationRepository();
  const refreshTokenRepository = new RefreshTokenRepository(tokenService);
  const accountTokenRepository = new AccountTokenRepository(tokenService);
  const emailService = createEmailService(environment, logger);
  const authService = new AuthService(
    organisationRepository,
    userRepository,
    refreshTokenRepository,
    accountTokenRepository,
    tokenService,
    emailService,
  );

  return {
    accountTokenRepository,
    authService,
    emailService,
    organisationRepository,
    refreshTokenRepository,
    tokenService,
    userRepository,
  };
}

export type IdentityDependencies = ReturnType<typeof createIdentityDependencies>;
