import {
  moveTaskSchema,
  objectIdSchema,
  taskInputSchema,
  taskListQuerySchema,
  updateTaskSchema,
} from '@nexops/shared';

import { AppError } from '../../common/errors/app-error.js';

import type { TaskService } from './task.service.js';
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
export function createTaskController(service: TaskService) {
  return {
    list: async (request: Request, response: Response) => {
      response.json({
        success: true,
        data: await service.list(actor(request), taskListQuerySchema.parse(request.query)),
        meta: {},
      });
    },
    get: async (request: Request, response: Response) => {
      response.json({
        success: true,
        data: await service.get(actor(request), objectIdSchema.parse(request.params.taskId)),
        meta: {},
      });
    },
    create: async (request: Request, response: Response) => {
      response.status(201).json({
        success: true,
        data: await service.create(actor(request), taskInputSchema.parse(request.body)),
        meta: {},
      });
    },
    update: async (request: Request, response: Response) => {
      response.json({
        success: true,
        data: await service.update(
          actor(request),
          objectIdSchema.parse(request.params.taskId),
          updateTaskSchema.parse(request.body),
        ),
        meta: {},
      });
    },
    move: async (request: Request, response: Response) => {
      response.json({
        success: true,
        data: await service.move(
          actor(request),
          objectIdSchema.parse(request.params.taskId),
          moveTaskSchema.parse(request.body),
        ),
        meta: {},
      });
    },
    delete: async (request: Request, response: Response) => {
      await service.delete(actor(request), objectIdSchema.parse(request.params.taskId));
      response.status(204).send();
    },
  };
}
