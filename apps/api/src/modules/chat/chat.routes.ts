import { chatHistoryQuerySchema, objectIdSchema } from '@nexops/shared';
import { Router } from 'express';

import { AppError } from '../../common/errors/app-error.js';
import { asyncHandler } from '../../common/http/async-handler.js';
import {
  requireAuthentication,
  requireOrganisation,
} from '../../common/middleware/authentication.js';
import { requirePermission } from '../../common/middleware/permission.js';

import type { ChatService } from './chat.service.js';
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

export function createChatRouter(identity: IdentityDependencies, service: ChatService): Router {
  const router = Router();
  router.use(
    requireAuthentication(identity.tokenService, identity.userRepository),
    requireOrganisation,
  );
  router.get(
    '/:projectId/messages',
    requirePermission('chat:read'),
    asyncHandler(async (request, response) => {
      const query = chatHistoryQuerySchema.parse(request.query);
      const result = await service.history(
        actor(request),
        objectIdSchema.parse(request.params.projectId),
        query.page,
        query.limit,
      );
      response.json({ success: true, data: result.items, meta: result.meta });
    }),
  );
  return router;
}
