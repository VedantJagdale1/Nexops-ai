import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';

import { asyncHandler } from '../../common/http/async-handler.js';
import {
  requireAuthentication,
  requireOrganisation,
} from '../../common/middleware/authentication.js';
import { requirePermission } from '../../common/middleware/permission.js';

import { createInvitationController } from './invitation.controller.js';
import { InvitationRepository } from './invitation.repository.js';
import { InvitationService } from './invitation.service.js';

import type { Environment } from '../../config/env.js';
import type { IdentityDependencies } from '../auth/identity.dependencies.js';

export function createInvitationRouter(
  identity: IdentityDependencies,
  environment: Pick<Environment, 'NODE_ENV'>,
): Router {
  const router = Router();
  const repository = new InvitationRepository(identity.tokenService);
  const service = new InvitationService(
    repository,
    identity.organisationRepository,
    identity.userRepository,
    identity.tokenService,
    identity.authService,
    identity.emailService,
  );
  const controller = createInvitationController(service, environment);
  const authenticated = requireAuthentication(identity.tokenService, identity.userRepository);
  const acceptanceLimiter = rateLimit({
    windowMs: 15 * 60 * 1_000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  });

  router.post(
    '/',
    authenticated,
    requireOrganisation,
    requirePermission('user:invite'),
    asyncHandler(controller.create),
  );
  router.post('/accept', acceptanceLimiter, asyncHandler(controller.accept));
  return router;
}
