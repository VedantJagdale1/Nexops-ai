import { objectIdSchema, paginationQuerySchema } from '@nexops/shared';
import { Router } from 'express';

import { AppError } from '../../common/errors/app-error.js';
import { asyncHandler } from '../../common/http/async-handler.js';
import {
  requireAuthentication,
  requireOrganisation,
} from '../../common/middleware/authentication.js';

import { NotificationRepository } from './notification.repository.js';
import { NotificationService } from './notification.service.js';

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

export function createNotificationRouter(identity: IdentityDependencies): Router {
  const router = Router();
  const service = new NotificationService(new NotificationRepository());

  router.use(
    requireAuthentication(identity.tokenService, identity.userRepository),
    requireOrganisation,
  );
  router.get(
    '/',
    asyncHandler(async (request, response) => {
      const query = paginationQuerySchema.parse(request.query);
      const result = await service.list(actor(request), query.page, query.limit);
      response.json({ success: true, data: result.items, meta: result.meta });
    }),
  );
  router.patch(
    '/read-all',
    asyncHandler(async (request, response) => {
      const count = await service.markAllRead(actor(request));
      response.json({ success: true, data: { count }, meta: {} });
    }),
  );
  router.patch(
    '/:notificationId/read',
    asyncHandler(async (request, response) => {
      response.json({
        success: true,
        data: await service.markRead(
          actor(request),
          objectIdSchema.parse(request.params.notificationId),
        ),
        meta: {},
      });
    }),
  );

  return router;
}
