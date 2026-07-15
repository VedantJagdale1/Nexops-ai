import { Router } from 'express';

import { asyncHandler } from '../../common/http/async-handler.js';
import {
  requireAuthentication,
  requireOrganisation,
} from '../../common/middleware/authentication.js';
import { requirePermission } from '../../common/middleware/permission.js';
import { noopRealtimePublisher } from '../../infrastructure/realtime/realtime.publisher.js';
import { ClientRepository } from '../clients/client.repository.js';
import { NotificationRepository } from '../notifications/notification.repository.js';
import { NotificationService } from '../notifications/notification.service.js';

import { createProjectController } from './project.controller.js';
import { ProjectRepository } from './project.repository.js';
import { ProjectService } from './project.service.js';

import type { RealtimePublisher } from '../../infrastructure/realtime/realtime.publisher.js';
import type { IdentityDependencies } from '../auth/identity.dependencies.js';

export function createProjectRouter(
  identity: IdentityDependencies,
  realtime: RealtimePublisher = noopRealtimePublisher,
): Router {
  const router = Router();
  const controller = createProjectController(
    new ProjectService(
      new ProjectRepository(),
      new ClientRepository(),
      identity.userRepository,
      new NotificationService(new NotificationRepository(), realtime),
    ),
  );
  router.use(
    requireAuthentication(identity.tokenService, identity.userRepository),
    requireOrganisation,
  );
  router.get('/', requirePermission('project:read'), asyncHandler(controller.list));
  router.post('/', requirePermission('project:create'), asyncHandler(controller.create));
  router.get('/:projectId', requirePermission('project:read'), asyncHandler(controller.get));
  router.patch('/:projectId', requirePermission('project:update'), asyncHandler(controller.update));
  router.delete(
    '/:projectId',
    requirePermission('project:delete'),
    asyncHandler(controller.delete),
  );
  return router;
}
