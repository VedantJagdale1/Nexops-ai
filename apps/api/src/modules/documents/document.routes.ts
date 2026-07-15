import { documentListQuerySchema, documentMetadataSchema, objectIdSchema } from '@nexops/shared';
import { Router } from 'express';
import multer from 'multer';

import { AppError } from '../../common/errors/app-error.js';
import { asyncHandler } from '../../common/http/async-handler.js';
import {
  requireAuthentication,
  requireOrganisation,
} from '../../common/middleware/authentication.js';
import { requirePermission } from '../../common/middleware/permission.js';
import { createStorageService } from '../../infrastructure/storage/storage.service.js';
import { ClientRepository } from '../clients/client.repository.js';
import { ProjectRepository } from '../projects/project.repository.js';
import { ProjectService } from '../projects/project.service.js';

import { DocumentRepository } from './document.repository.js';
import { DocumentService } from './document.service.js';

import type { Environment } from '../../config/env.js';
import type { IdentityDependencies } from '../auth/identity.dependencies.js';
import type { Request } from 'express';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 10 },
});

function actor(request: Request) {
  if (!request.auth) {
    throw new AppError({
      code: 'AUTHENTICATION_REQUIRED',
      message: 'Authentication is required',
      statusCode: 401,
    });
  }
  return request.auth;
}

export function createDocumentRouter(
  identity: IdentityDependencies,
  environment: Environment,
): Router {
  const router = Router();
  const clients = new ClientRepository();
  const projects = new ProjectService(new ProjectRepository(), clients, identity.userRepository);
  const service = new DocumentService(
    new DocumentRepository(),
    createStorageService(environment),
    projects,
    clients,
  );

  router.use(
    requireAuthentication(identity.tokenService, identity.userRepository),
    requireOrganisation,
  );
  router.get(
    '/',
    requirePermission('document:read'),
    asyncHandler(async (request, response) => {
      const query = documentListQuerySchema.parse(request.query);
      const result = await service.list(actor(request), query);
      response.json({ success: true, data: result.items, meta: result.meta });
    }),
  );
  router.post(
    '/',
    requirePermission('document:upload'),
    upload.single('file'),
    asyncHandler(async (request, response) => {
      response.status(201).json({
        success: true,
        data: await service.upload(
          actor(request),
          documentMetadataSchema.parse(request.body),
          request.file,
        ),
        meta: {},
      });
    }),
  );
  router.get(
    '/:documentId/download',
    requirePermission('document:read'),
    asyncHandler(async (request, response) => {
      const result = await service.download(
        actor(request),
        objectIdSchema.parse(request.params.documentId),
      );
      const safeName = result.document.name.replace(/["\r\n]/g, '_');
      response
        .type(result.document.mimeType)
        .setHeader('Content-Disposition', `attachment; filename="${safeName}"`)
        .send(result.content);
    }),
  );
  router.delete(
    '/:documentId',
    requirePermission('document:upload'),
    asyncHandler(async (request, response) => {
      await service.delete(actor(request), objectIdSchema.parse(request.params.documentId));
      response.status(204).send();
    }),
  );
  return router;
}
