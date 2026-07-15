import { Router } from 'express';

import { AppError } from '../../common/errors/app-error.js';
import { asyncHandler } from '../../common/http/async-handler.js';
import {
  requireAuthentication,
  requireOrganisation,
} from '../../common/middleware/authentication.js';
import { requirePermission } from '../../common/middleware/permission.js';

import { AnalyticsService } from './analytics.service.js';

import type { IdentityDependencies } from '../auth/identity.dependencies.js';
export function createAnalyticsRouter(identity: IdentityDependencies): Router {
  const router = Router();
  const service = new AnalyticsService();
  router.get(
    '/dashboard',
    requireAuthentication(identity.tokenService, identity.userRepository),
    requireOrganisation,
    requirePermission('analytics:read'),
    asyncHandler(async (request, response) => {
      if (!request.auth)
        throw new AppError({
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required',
          statusCode: 401,
        });
      response.json({ success: true, data: await service.dashboard(request.auth), meta: {} });
    }),
  );
  return router;
}
