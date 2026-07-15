import {
  createInvoiceSchema,
  invoiceListQuerySchema,
  objectIdSchema,
  updateInvoiceStatusSchema,
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

import { InvoiceRepository } from './invoice.repository.js';
import { InvoiceService } from './invoice.service.js';

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

export function createInvoiceRouter(
  identity: IdentityDependencies,
  realtime: RealtimePublisher = noopRealtimePublisher,
): Router {
  const router = Router();
  const service = new InvoiceService(
    new InvoiceRepository(),
    new ClientRepository(),
    new ProjectRepository(),
    new NotificationService(new NotificationRepository(), realtime),
  );

  router.use(
    requireAuthentication(identity.tokenService, identity.userRepository),
    requireOrganisation,
  );
  router.get(
    '/',
    requirePermission('invoice:read'),
    asyncHandler(async (request, response) => {
      const query = invoiceListQuerySchema.parse(request.query);
      const result = await service.list(actor(request), query);
      response.json({ success: true, data: result.items, meta: result.meta });
    }),
  );
  router.post(
    '/',
    requirePermission('invoice:manage'),
    asyncHandler(async (request, response) => {
      response.status(201).json({
        success: true,
        data: await service.create(actor(request), createInvoiceSchema.parse(request.body)),
        meta: {},
      });
    }),
  );
  router.get(
    '/:invoiceId',
    requirePermission('invoice:read'),
    asyncHandler(async (request, response) => {
      response.json({
        success: true,
        data: await service.get(actor(request), objectIdSchema.parse(request.params.invoiceId)),
        meta: {},
      });
    }),
  );
  router.patch(
    '/:invoiceId/status',
    requirePermission('invoice:manage'),
    asyncHandler(async (request, response) => {
      response.json({
        success: true,
        data: await service.updateStatus(
          actor(request),
          objectIdSchema.parse(request.params.invoiceId),
          updateInvoiceStatusSchema.parse(request.body),
        ),
        meta: {},
      });
    }),
  );
  return router;
}
