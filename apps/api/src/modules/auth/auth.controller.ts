import {
  forgotPasswordSchema,
  loginSchema,
  registerOrganisationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '@nexops/shared';

import { AppError } from '../../common/errors/app-error.js';

import { clearRefreshCookie, readRefreshCookie, setRefreshCookie } from './refresh-cookie.js';

import type { AuthService } from './auth.service.js';
import type { Environment } from '../../config/env.js';
import type { Request, Response } from 'express';

function requestMetadata(request: Request) {
  const userAgent = request.header('user-agent');
  return {
    ...(request.ip ? { ip: request.ip } : {}),
    ...(userAgent ? { userAgent } : {}),
  };
}

export function createAuthController(
  auth: AuthService,
  environment: Pick<Environment, 'NODE_ENV'>,
) {
  return {
    register: async (request: Request, response: Response): Promise<void> => {
      const session = await auth.register(
        registerOrganisationSchema.parse(request.body),
        requestMetadata(request),
      );
      setRefreshCookie(response, session.refreshToken, session.refreshExpiresAt, environment);
      response.status(201).json({
        success: true,
        data: { accessToken: session.accessToken, user: session.user },
        meta: {},
      });
    },

    login: async (request: Request, response: Response): Promise<void> => {
      const session = await auth.login(loginSchema.parse(request.body), requestMetadata(request));
      setRefreshCookie(response, session.refreshToken, session.refreshExpiresAt, environment);
      response.status(200).json({
        success: true,
        data: { accessToken: session.accessToken, user: session.user },
        meta: {},
      });
    },

    refresh: async (request: Request, response: Response): Promise<void> => {
      const refreshToken = readRefreshCookie(request);
      if (!refreshToken) {
        throw new AppError({
          code: 'REFRESH_TOKEN_REQUIRED',
          message: 'A refresh token is required',
          statusCode: 401,
        });
      }
      const session = await auth.refresh(refreshToken, requestMetadata(request));
      setRefreshCookie(response, session.refreshToken, session.refreshExpiresAt, environment);
      response.status(200).json({
        success: true,
        data: { accessToken: session.accessToken, user: session.user },
        meta: {},
      });
    },

    logout: async (request: Request, response: Response): Promise<void> => {
      await auth.logout(readRefreshCookie(request), requestMetadata(request));
      clearRefreshCookie(response, environment);
      response.status(204).send();
    },

    forgotPassword: async (request: Request, response: Response): Promise<void> => {
      await auth.forgotPassword(forgotPasswordSchema.parse(request.body));
      response.status(202).json({
        success: true,
        data: {
          message: 'If an active account exists, password reset instructions have been sent.',
        },
        meta: {},
      });
    },

    resetPassword: async (request: Request, response: Response): Promise<void> => {
      await auth.resetPassword(resetPasswordSchema.parse(request.body));
      clearRefreshCookie(response, environment);
      response.status(200).json({
        success: true,
        data: { message: 'Password reset successfully. Sign in with your new password.' },
        meta: {},
      });
    },

    verifyEmail: async (request: Request, response: Response): Promise<void> => {
      const input = verifyEmailSchema.parse(request.body);
      await auth.verifyEmail(input.token);
      response.status(200).json({
        success: true,
        data: { message: 'Email verified successfully.' },
        meta: {},
      });
    },

    me: (request: Request, response: Response): Promise<void> => {
      if (!request.auth) {
        throw new AppError({
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required',
          statusCode: 401,
        });
      }
      response.status(200).json({ success: true, data: request.auth, meta: {} });
      return Promise.resolve();
    },
  };
}
