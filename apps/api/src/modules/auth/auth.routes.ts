import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';

import { AppError } from '../../common/errors/app-error.js';
import { asyncHandler } from '../../common/http/async-handler.js';
import {
  requireAuthentication,
  requireOrganisation,
} from '../../common/middleware/authentication.js';

import { createAuthController } from './auth.controller.js';

import type { IdentityDependencies } from './identity.dependencies.js';
import type { Environment } from '../../config/env.js';

const authenticationLimiter = rateLimit({
  windowMs: 15 * 60 * 1_000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_request, _response, next) => {
    next(
      new AppError({
        code: 'AUTH_RATE_LIMITED',
        message: 'Too many authentication attempts. Please try again later.',
        statusCode: 429,
      }),
    );
  },
});

export function createAuthRouter(
  identity: IdentityDependencies,
  environment: Pick<Environment, 'NODE_ENV'>,
): Router {
  const router = Router();
  const controller = createAuthController(identity.authService, environment);
  const authenticated = requireAuthentication(identity.tokenService, identity.userRepository);

  router.post('/register', authenticationLimiter, asyncHandler(controller.register));
  router.post('/login', authenticationLimiter, asyncHandler(controller.login));
  router.post('/refresh', authenticationLimiter, asyncHandler(controller.refresh));
  router.post('/logout', asyncHandler(controller.logout));
  router.post('/forgot-password', authenticationLimiter, asyncHandler(controller.forgotPassword));
  router.post('/reset-password', authenticationLimiter, asyncHandler(controller.resetPassword));
  router.post('/verify-email', authenticationLimiter, asyncHandler(controller.verifyEmail));
  router.get('/me', authenticated, requireOrganisation, asyncHandler(controller.me));

  return router;
}
