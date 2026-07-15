import { buildTenantFilter } from '../../common/repositories/tenant-repository.js';

import { DocumentModel } from './document.model.js';

import type { Document } from './document.model.js';
import type { FilterQuery, HydratedDocument } from 'mongoose';

export interface DocumentListOptions {
  page: number;
  limit: number;
  projectId?: string | undefined;
  clientId?: string | undefined;
  category?: string | undefined;
}

export class DocumentRepository {
  public create(data: Omit<Document, 'createdAt'>): Promise<HydratedDocument<Document>> {
    return DocumentModel.create(data);
  }

  public async list(
    organisationId: string,
    options: DocumentListOptions,
  ): Promise<{ items: Array<HydratedDocument<Document>>; total: number }> {
    const filter: FilterQuery<Document> = { deletedAt: { $exists: false } };
    if (options.projectId) filter.projectId = options.projectId;
    if (options.clientId) filter.clientId = options.clientId;
    if (options.category) filter.category = options.category;
    const tenantFilter = buildTenantFilter(organisationId, filter);
    const [items, total] = await Promise.all([
      DocumentModel.find(tenantFilter)
        .sort({ createdAt: -1, _id: 1 })
        .skip((options.page - 1) * options.limit)
        .limit(options.limit)
        .exec(),
      DocumentModel.countDocuments(tenantFilter),
    ]);
    return { items, total };
  }

  public findById(organisationId: string, id: string): Promise<HydratedDocument<Document> | null> {
    return DocumentModel.findOne(
      buildTenantFilter(organisationId, { _id: id, deletedAt: { $exists: false } }),
    ).exec();
  }

  public async softDelete(organisationId: string, id: string): Promise<boolean> {
    const result = await DocumentModel.updateOne(
      buildTenantFilter(organisationId, { _id: id, deletedAt: { $exists: false } }),
      { $set: { deletedAt: new Date() } },
    );
    return result.modifiedCount === 1;
  }
}
