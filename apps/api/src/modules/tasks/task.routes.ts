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
import { ProjectRepository } from '../projects/project.repository.js';
import { ProjectService } from '../projects/project.service.js';

import { createTaskController } from './task.controller.js';
import { TaskRepository } from './task.repository.js';
import { TaskService } from './task.service.js';

import type { RealtimePublisher } from '../../infrastructure/realtime/realtime.publisher.js';
import type { IdentityDependencies } from '../auth/identity.dependencies.js';
export function createTaskRouter(
  identity: IdentityDependencies,
  realtime: RealtimePublisher = noopRealtimePublisher,
): Router {
  const router = Router();
  const projects = new ProjectService(
    new ProjectRepository(),
    new ClientRepository(),
    identity.userRepository,
  );
  const controller = createTaskController(
    new TaskService(
      new TaskRepository(),
      projects,
      identity.userRepository,
      new NotificationService(new NotificationRepository(), realtime),
      realtime,
    ),
  );
  router.use(
    requireAuthentication(identity.tokenService, identity.userRepository),
    requireOrganisation,
  );
  router.get('/', requirePermission('task:read'), asyncHandler(controller.list));
  router.post('/', requirePermission('task:create'), asyncHandler(controller.create));
  router.get('/:taskId', requirePermission('task:read'), asyncHandler(controller.get));
  router.patch('/:taskId', requirePermission('task:update'), asyncHandler(controller.update));
  router.patch('/:taskId/move', requirePermission('task:update'), asyncHandler(controller.move));
  router.delete('/:taskId', requirePermission('project:update'), asyncHandler(controller.delete));
  return router;
}
