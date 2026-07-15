import {
  clientInputSchema,
  clientListQuerySchema,
  objectIdSchema,
  updateClientSchema,
} from '@nexops/shared';

import { AppError } from '../../common/errors/app-error.js';

import type { ClientService } from './client.service.js';
import type { Request, Response } from 'express';

function actor(request: Request) {
  if (!request.auth)
    throw new AppError({
      code: 'AUTHENTICATION_REQUIRED',
      message: 'Authentication is required',
      statusCode: 401,
    });
  return request.auth;
}

export function createClientController(service: ClientService) {
  return {
    list: async (request: Request, response: Response): Promise<void> => {
      const query = clientListQuerySchema.parse(request.query);
      const result = await service.list(actor(request), query);
      response.json({ success: true, data: result.items, meta: result.meta });
    },
    get: async (request: Request, response: Response): Promise<void> => {
      const data = await service.get(actor(request), objectIdSchema.parse(request.params.clientId));
      response.json({ success: true, data, meta: {} });
    },
    create: async (request: Request, response: Response): Promise<void> => {
      const data = await service.create(actor(request), clientInputSchema.parse(request.body));
      response.status(201).json({ success: true, data, meta: {} });
    },
    update: async (request: Request, response: Response): Promise<void> => {
      const data = await service.update(
        actor(request),
        objectIdSchema.parse(request.params.clientId),
        updateClientSchema.parse(request.body),
      );
      response.json({ success: true, data, meta: {} });
    },
    delete: async (request: Request, response: Response): Promise<void> => {
      await service.delete(actor(request), objectIdSchema.parse(request.params.clientId));
      response.status(204).send();
    },
  };
}
