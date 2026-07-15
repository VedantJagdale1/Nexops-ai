import { AppError } from '../errors/app-error.js';

import type { NextFunction, Request, Response } from 'express';

export function notFoundHandler(request: Request, _response: Response, next: NextFunction): void {
  next(
    new AppError({
      code: 'ROUTE_NOT_FOUND',
      message: `Route ${request.method} ${request.path} was not found`,
      statusCode: 404,
    }),
  );
}
