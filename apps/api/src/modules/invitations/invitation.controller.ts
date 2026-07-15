import { acceptInvitationSchema, createInvitationSchema } from '@nexops/shared';

import { AppError } from '../../common/errors/app-error.js';
import { setRefreshCookie } from '../auth/refresh-cookie.js';

import type { InvitationService } from './invitation.service.js';
import type { Environment } from '../../config/env.js';
import type { Request, Response } from 'express';

function metadata(request: Request) {
  const userAgent = request.header('user-agent');
  return {
    ...(request.ip ? { ip: request.ip } : {}),
    ...(userAgent ? { userAgent } : {}),
  };
}

export function createInvitationController(
  invitations: InvitationService,
  environment: Pick<Environment, 'NODE_ENV'>,
) {
  return {
    create: async (request: Request, response: Response): Promise<void> => {
      if (!request.auth) {
        throw new AppError({
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required',
          statusCode: 401,
        });
      }
      const invitation = await invitations.create(
        createInvitationSchema.parse(request.body),
        request.auth,
      );
      response.status(201).json({ success: true, data: invitation, meta: {} });
    },

    accept: async (request: Request, response: Response): Promise<void> => {
      const session = await invitations.accept(
        acceptInvitationSchema.parse(request.body),
        metadata(request),
      );
      setRefreshCookie(response, session.refreshToken, session.refreshExpiresAt, environment);
      response.status(200).json({
        success: true,
        data: { accessToken: session.accessToken, user: session.user },
        meta: {},
      });
    },
  };
}
