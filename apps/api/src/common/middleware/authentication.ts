import { toAuthenticatedUser } from '../../modules/auth/auth.types.js';
import { AppError } from '../errors/app-error.js';
import { asyncHandler } from '../http/async-handler.js';

import type { TokenService } from '../../modules/auth/token.service.js';
import type { UserRepositoryContract } from '../../modules/users/user.repository.js';
import type { RequestHandler } from 'express';

export function requireAuthentication(
  tokens: TokenService,
  users: UserRepositoryContract,
): RequestHandler {
  return asyncHandler(async (request, _response, next) => {
    const authorization = request.header('authorization');
    const [scheme, token] = authorization?.split(' ') ?? [];
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new AppError({
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication is required',
        statusCode: 401,
      });
    }

    const claims = tokens.verifyAccessToken(token);
    const user = await users.findById(claims.userId);
    if (
      !user ||
      user.status !== 'active' ||
      user.organisationId.toString() !== claims.organisationId
    ) {
      throw new AppError({
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication is required',
        statusCode: 401,
      });
    }

    request.auth = toAuthenticatedUser(user);
    next();
  });
}

export const requireOrganisation: RequestHandler = (request, _response, next): void => {
  if (!request.auth?.organisationId) {
    next(
      new AppError({
        code: 'ORGANISATION_REQUIRED',
        message: 'An organisation context is required',
        statusCode: 403,
      }),
    );
    return;
  }
  next();
};
