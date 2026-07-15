import multer from 'multer';
import { ZodError } from 'zod';

import { AppError } from '../errors/app-error.js';

import type { AppLogger } from '../../config/logger.js';
import type { ErrorResponse } from '@nexops/shared';
import type { ErrorRequestHandler } from 'express';

export function createErrorHandler(logger: AppLogger): ErrorRequestHandler {
  return (error: unknown, request, response, _next): void => {
    const appError = normalizeError(error);
    const requestId = typeof request.id === 'string' ? request.id : 'unknown';
    const payload: ErrorResponse = {
      success: false,
      error: {
        code: appError.code,
        message: appError.message,
        details: appError.details,
      },
      requestId,
    };

    const logContext = { err: error, requestId, code: appError.code };
    if (appError.statusCode >= 500) logger.error(logContext, appError.message);
    else logger.warn(logContext, appError.message);

    response.status(appError.statusCode).json(payload);
  };
}

function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof ZodError) {
    return new AppError({
      code: 'VALIDATION_ERROR',
      message: 'The request contains invalid data',
      statusCode: 422,
      details: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  if (error instanceof multer.MulterError) {
    return new AppError({
      code: error.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : 'FILE_UPLOAD_INVALID',
      message:
        error.code === 'LIMIT_FILE_SIZE'
          ? 'Files must be 10 MB or smaller'
          : 'The file upload is invalid',
      statusCode: 422,
    });
  }

  return new AppError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
    statusCode: 500,
    cause: error,
  });
}
