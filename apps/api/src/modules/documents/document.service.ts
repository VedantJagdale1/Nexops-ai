import { AppError } from '../../common/errors/app-error.js';

import type { Document } from './document.model.js';
import type { DocumentListOptions, DocumentRepository } from './document.repository.js';
import type { StorageService } from '../../infrastructure/storage/storage.service.js';
import type { ClientRepository } from '../clients/client.repository.js';
import type { ProjectService } from '../projects/project.service.js';
import type {
  AuthenticatedUserDto,
  DocumentDto,
  DocumentMetadataInput,
  PaginationMeta,
} from '@nexops/shared';
import type { HydratedDocument, Types } from 'mongoose';

const acceptedMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'text/csv',
  'text/plain',
]);

function toDto(document: HydratedDocument<Document>): DocumentDto {
  return {
    id: document._id.toString(),
    ...(document.projectId ? { projectId: document.projectId.toString() } : {}),
    ...(document.clientId ? { clientId: document.clientId.toString() } : {}),
    ...(document.taskId ? { taskId: document.taskId.toString() } : {}),
    ...(document.ticketId ? { ticketId: document.ticketId.toString() } : {}),
    uploadedBy: document.uploadedBy.toString(),
    name: document.name,
    mimeType: document.mimeType,
    size: document.size,
    category: document.category,
    createdAt: document.createdAt.toISOString(),
  };
}

export class DocumentService {
  public constructor(
    private readonly repository: DocumentRepository,
    private readonly storage: StorageService,
    private readonly projects: ProjectService,
    private readonly clients: ClientRepository,
  ) {}

  public async list(
    user: AuthenticatedUserDto,
    options: DocumentListOptions,
  ): Promise<{ items: DocumentDto[]; meta: PaginationMeta }> {
    if (options.projectId) await this.projects.requireAccessible(user, options.projectId);
    if ((user.role === 'developer' || user.role === 'project_manager') && !options.projectId) {
      throw new AppError({
        code: 'DOCUMENT_PROJECT_REQUIRED',
        message: 'A project filter is required',
        statusCode: 422,
      });
    }
    const result = await this.repository.list(user.organisationId, {
      ...options,
      ...(user.role === 'client' && user.clientId ? { clientId: user.clientId } : {}),
    });
    return {
      items: result.items.map(toDto),
      meta: {
        page: options.page,
        limit: options.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / options.limit),
      },
    };
  }

  public async upload(
    user: AuthenticatedUserDto,
    metadata: DocumentMetadataInput,
    file: Express.Multer.File | undefined,
  ): Promise<DocumentDto> {
    if (!file) {
      throw new AppError({ code: 'FILE_REQUIRED', message: 'A file is required', statusCode: 422 });
    }
    if (!acceptedMimeTypes.has(file.mimetype)) {
      throw new AppError({
        code: 'FILE_TYPE_INVALID',
        message: 'This file type is not supported',
        statusCode: 422,
      });
    }
    let clientId = metadata.clientId;
    if (metadata.projectId) {
      const project = await this.projects.requireAccessible(user, metadata.projectId);
      clientId = project.clientId.toString();
    } else if (clientId && !(await this.clients.findById(user.organisationId, clientId))) {
      throw new AppError({
        code: 'CLIENT_NOT_FOUND',
        message: 'Client not found',
        statusCode: 404,
      });
    }
    const stored = await this.storage.store(user.organisationId, file.originalname, file.buffer);
    try {
      const document = await this.repository.create({
        organisationId: user.organisationId as unknown as Types.ObjectId,
        ...(metadata.projectId
          ? { projectId: metadata.projectId as unknown as Types.ObjectId }
          : {}),
        ...(clientId ? { clientId: clientId as unknown as Types.ObjectId } : {}),
        uploadedBy: user.id as unknown as Types.ObjectId,
        name: file.originalname,
        fileUrl: stored.privateLocator,
        storageKey: stored.key,
        mimeType: file.mimetype,
        size: file.size,
        category: metadata.category ?? 'general',
      });
      return toDto(document);
    } catch (error) {
      await this.storage.delete(stored.key);
      throw error;
    }
  }

  public async download(
    user: AuthenticatedUserDto,
    id: string,
  ): Promise<{ document: DocumentDto; content: Buffer }> {
    const document = await this.requireAccess(user, id);
    return { document: toDto(document), content: await this.storage.read(document.storageKey) };
  }

  public async delete(user: AuthenticatedUserDto, id: string): Promise<void> {
    const document = await this.requireAccess(user, id);
    if (!(await this.repository.softDelete(user.organisationId, id))) throw this.notFound();
    await this.storage.delete(document.storageKey);
  }

  private async requireAccess(
    user: AuthenticatedUserDto,
    id: string,
  ): Promise<HydratedDocument<Document>> {
    const document = await this.repository.findById(user.organisationId, id);
    if (!document) throw this.notFound();
    if (document.projectId) {
      await this.projects.requireAccessible(user, document.projectId.toString());
    } else if (user.role === 'client' && user.clientId !== document.clientId?.toString()) {
      throw this.notFound();
    }
    return document;
  }

  private notFound(): AppError {
    return new AppError({
      code: 'DOCUMENT_NOT_FOUND',
      message: 'Document not found',
      statusCode: 404,
    });
  }
}
