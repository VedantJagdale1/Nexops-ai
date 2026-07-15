import { Router } from 'express';

import { asyncHandler } from '../../common/http/async-handler.js';
import {
  requireAuthentication,
  requireOrganisation,
} from '../../common/middleware/authentication.js';
import { requirePermission } from '../../common/middleware/permission.js';

import { createClientController } from './client.controller.js';
import { ClientRepository } from './client.repository.js';
import { ClientService } from './client.service.js';

import type { IdentityDependencies } from '../auth/identity.dependencies.js';

export function createClientRouter(identity: IdentityDependencies): Router {
  const router = Router();
  const controller = createClientController(new ClientService(new ClientRepository()));
  router.use(
    requireAuthentication(identity.tokenService, identity.userRepository),
    requireOrganisation,
  );
  router.get('/', requirePermission('client:read'), asyncHandler(controller.list));
  router.post('/', requirePermission('client:create'), asyncHandler(controller.create));
  router.get('/:clientId', requirePermission('client:read'), asyncHandler(controller.get));
  router.patch('/:clientId', requirePermission('client:update'), asyncHandler(controller.update));
  router.delete('/:clientId', requirePermission('client:delete'), asyncHandler(controller.delete));
  return router;
}
