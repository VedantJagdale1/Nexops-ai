import { roleHasPermission } from '@nexops/shared';

import { AppError } from '../errors/app-error.js';

import type { Permission } from '@nexops/shared';
import type { RequestHandler } from 'express';

export function requirePermission(permission: Permission): RequestHandler {
  return (request, _response, next): void => {
    if (!request.auth || !roleHasPermission(request.auth.role, permission)) {
      next(
        new AppError({
          code: 'PERMISSION_DENIED',
          message: 'You do not have permission to perform this action',
          statusCode: 403,
        }),
      );
      return;
    }
    next();
  };
}
