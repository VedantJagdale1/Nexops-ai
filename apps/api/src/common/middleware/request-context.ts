import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

export function requestContext(request: Request, response: Response, next: NextFunction): void {
  const incomingRequestId = request.header('x-request-id');
  const requestId =
    incomingRequestId && incomingRequestId.length <= 128 ? incomingRequestId : randomUUID();

  request.id = requestId;
  response.setHeader('x-request-id', requestId);
  next();
}
