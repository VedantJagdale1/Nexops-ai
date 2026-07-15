import { randomUUID } from 'node:crypto';

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import mongoSanitize from 'express-mongo-sanitize';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';

import { createErrorHandler } from './common/middleware/error-handler.js';
import { notFoundHandler } from './common/middleware/not-found.js';
import { requestContext } from './common/middleware/request-context.js';
import { noopRealtimePublisher } from './infrastructure/realtime/realtime.publisher.js';
import { createAnalyticsRouter } from './modules/analytics/analytics.routes.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createIdentityDependencies } from './modules/auth/identity.dependencies.js';
import { createChatDependencies } from './modules/chat/chat.dependencies.js';
import { createChatRouter } from './modules/chat/chat.routes.js';
import { createClientRouter } from './modules/clients/client.routes.js';
import { createDocumentRouter } from './modules/documents/document.routes.js';
import { healthRouter } from './modules/health/health.routes.js';
import { createInvitationRouter } from './modules/invitations/invitation.routes.js';
import { createInvoiceRouter } from './modules/invoices/invoice.routes.js';
import { createNotificationRouter } from './modules/notifications/notification.routes.js';
import { createProjectRouter } from './modules/projects/project.routes.js';
import { createTaskRouter } from './modules/tasks/task.routes.js';
import { createTicketRouter } from './modules/tickets/ticket.routes.js';
import { createUserRouter } from './modules/users/user.routes.js';

import type { Environment } from './config/env.js';
import type { AppLogger } from './config/logger.js';
import type { RealtimePublisher } from './infrastructure/realtime/realtime.publisher.js';
import type { IdentityDependencies } from './modules/auth/identity.dependencies.js';

export interface AppDependencies {
  environment: Environment;
  logger: AppLogger;
  identity?: IdentityDependencies;
  realtime?: RealtimePublisher;
}

export function createApp({
  environment,
  logger,
  identity: suppliedIdentity,
  realtime = noopRealtimePublisher,
}: AppDependencies): express.Express {
  const app = express();
  const identity = suppliedIdentity ?? createIdentityDependencies(environment, logger);
  const collaboration = createChatDependencies(identity, realtime);

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(requestContext);
  app.use(
    pinoHttp({
      logger,
      genReqId: (request) => request.id ?? randomUUID(),
    }),
  );
  app.use(helmet());
  app.use(
    cors({
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      origin: environment.CLIENT_URL,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(cookieParser(environment.COOKIE_SECRET));
  app.use(mongoSanitize({ replaceWith: '_' }));

  app.use('/api/v1/auth', createAuthRouter(identity, environment));
  app.use('/api/v1/invitations', createInvitationRouter(identity, environment));
  app.use('/api/v1/users', createUserRouter(identity));
  app.use('/api/v1/clients', createClientRouter(identity));
  app.use('/api/v1/projects', createChatRouter(identity, collaboration.chat));
  app.use('/api/v1/projects', createProjectRouter(identity, realtime));
  app.use('/api/v1/tasks', createTaskRouter(identity, realtime));
  app.use('/api/v1/tickets', createTicketRouter(identity, realtime));
  app.use('/api/v1/invoices', createInvoiceRouter(identity, realtime));
  app.use('/api/v1/documents', createDocumentRouter(identity, environment));
  app.use('/api/v1/notifications', createNotificationRouter(identity));
  app.use('/api/v1/analytics', createAnalyticsRouter(identity));
  app.use('/api/v1/health', healthRouter);
  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));

  return app;
}
