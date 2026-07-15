import { Router } from 'express';

import { asyncHandler } from '../../common/http/async-handler.js';
import {
  requireAuthentication,
  requireOrganisation,
} from '../../common/middleware/authentication.js';
import { requirePermission } from '../../common/middleware/permission.js';

import { listUsers } from './user.controller.js';

import type { IdentityDependencies } from '../auth/identity.dependencies.js';
export function createUserRouter(identity: IdentityDependencies): Router {
  const router = Router();
  router.get(
    '/',
    requireAuthentication(identity.tokenService, identity.userRepository),
    requireOrganisation,
    requirePermission('user:read'),
    asyncHandler(listUsers),
  );
  return router;
}
