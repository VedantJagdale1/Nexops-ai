import {
  objectIdSchema,
  projectInputSchema,
  projectListQuerySchema,
  updateProjectSchema,
} from '@nexops/shared';

import { AppError } from '../../common/errors/app-error.js';

import type { ProjectService } from './project.service.js';
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
export function createProjectController(service: ProjectService) {
  return {
    list: async (request: Request, response: Response) => {
      const result = await service.list(
        actor(request),
        projectListQuerySchema.parse(request.query),
      );
      response.json({ success: true, data: result.items, meta: result.meta });
    },
    get: async (request: Request, response: Response) => {
      response.json({
        success: true,
        data: await service.get(actor(request), objectIdSchema.parse(request.params.projectId)),
        meta: {},
      });
    },
    create: async (request: Request, response: Response) => {
      response.status(201).json({
        success: true,
        data: await service.create(actor(request), projectInputSchema.parse(request.body)),
        meta: {},
      });
    },
    update: async (request: Request, response: Response) => {
      response.json({
        success: true,
        data: await service.update(
          actor(request),
          objectIdSchema.parse(request.params.projectId),
          updateProjectSchema.parse(request.body),
        ),
        meta: {},
      });
    },
    delete: async (request: Request, response: Response) => {
      await service.delete(actor(request), objectIdSchema.parse(request.params.projectId));
      response.status(204).send();
    },
  };
}
