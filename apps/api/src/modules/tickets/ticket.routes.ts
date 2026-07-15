import {
  createTicketSchema,
  objectIdSchema,
  ticketListQuerySchema,
  ticketMessageInputSchema,
  updateTicketSchema,
} from '@nexops/shared';
import { Router } from 'express';

import { AppError } from '../../common/errors/app-error.js';
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

import { TicketRepository } from './ticket.repository.js';
import { TicketService } from './ticket.service.js';

import type { RealtimePublisher } from '../../infrastructure/realtime/realtime.publisher.js';
import type { IdentityDependencies } from '../auth/identity.dependencies.js';
import type { Request } from 'express';

function actor(request: Request) {
  if (!request.auth) {
    throw new AppError({
      code: 'AUTHENTICATION_REQUIRED',
      message: 'Authentication is required',
      statusCode: 401,
    });
  }
  return request.auth;
}

export function createTicketRouter(
  identity: IdentityDependencies,
  realtime: RealtimePublisher = noopRealtimePublisher,
): Router {
  const router = Router();
  const service = new TicketService(
    new TicketRepository(),
    new ClientRepository(),
    new ProjectRepository(),
    identity.userRepository,
    new NotificationService(new NotificationRepository(), realtime),
    realtime,
  );

  router.use(
    requireAuthentication(identity.tokenService, identity.userRepository),
    requireOrganisation,
  );
  router.get(
    '/',
    requirePermission('ticket:read'),
    asyncHandler(async (request, response) => {
      const query = ticketListQuerySchema.parse(request.query);
      const result = await service.list(actor(request), query);
      response.json({ success: true, data: result.items, meta: result.meta });
    }),
  );
  router.post(
    '/',
    requirePermission('ticket:create'),
    asyncHandler(async (request, response) => {
      response.status(201).json({
        success: true,
        data: await service.create(actor(request), createTicketSchema.parse(request.body)),
        meta: {},
      });
    }),
  );
  router.get(
    '/:ticketId',
    requirePermission('ticket:read'),
    asyncHandler(async (request, response) => {
      response.json({
        success: true,
        data: await service.get(actor(request), objectIdSchema.parse(request.params.ticketId)),
        meta: {},
      });
    }),
  );
  router.patch(
    '/:ticketId',
    requirePermission('ticket:manage'),
    asyncHandler(async (request, response) => {
      response.json({
        success: true,
        data: await service.update(
          actor(request),
          objectIdSchema.parse(request.params.ticketId),
          updateTicketSchema.parse(request.body),
        ),
        meta: {},
      });
    }),
  );
  router.get(
    '/:ticketId/messages',
    requirePermission('ticket:read'),
    asyncHandler(async (request, response) => {
      response.json({
        success: true,
        data: await service.messages(actor(request), objectIdSchema.parse(request.params.ticketId)),
        meta: {},
      });
    }),
  );
  router.post(
    '/:ticketId/messages',
    requirePermission('ticket:create'),
    asyncHandler(async (request, response) => {
      response.status(201).json({
        success: true,
        data: await service.addMessage(
          actor(request),
          objectIdSchema.parse(request.params.ticketId),
          ticketMessageInputSchema.parse(request.body),
        ),
        meta: {},
      });
    }),
  );

  return router;
}
