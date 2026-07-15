import { buildTenantFilter } from '../../common/repositories/tenant-repository.js';

import { ClientModel } from './client.model.js';

import type { Client } from './client.model.js';
import type { FilterQuery, HydratedDocument } from 'mongoose';

export interface ClientListOptions {
  page: number;
  limit: number;
  search?: string | undefined;
  status?: Client['status'] | undefined;
  sortBy: 'companyName' | 'status' | 'createdAt' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
  clientId?: string | undefined;
}

export interface ClientPage {
  items: Array<HydratedDocument<Client>>;
  total: number;
}

export class ClientRepository {
  public async create(
    data: Omit<Client, 'createdAt' | 'updatedAt'>,
  ): Promise<HydratedDocument<Client>> {
    return ClientModel.create(data);
  }

  public async list(organisationId: string, options: ClientListOptions): Promise<ClientPage> {
    const filter: FilterQuery<Client> = {};
    if (options.clientId) filter._id = options.clientId;
    if (options.status) filter.status = options.status;
    if (options.search) {
      const escaped = options.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { companyName: { $regex: escaped, $options: 'i' } },
        { contactName: { $regex: escaped, $options: 'i' } },
        { contactEmail: { $regex: escaped, $options: 'i' } },
      ];
    }
    const tenantFilter = buildTenantFilter(organisationId, filter);
    const [items, total] = await Promise.all([
      ClientModel.find(tenantFilter)
        .sort({ [options.sortBy]: options.sortOrder === 'asc' ? 1 : -1, _id: 1 })
        .skip((options.page - 1) * options.limit)
        .limit(options.limit)
        .exec(),
      ClientModel.countDocuments(tenantFilter),
    ]);
    return { items, total };
  }

  public async findById(
    organisationId: string,
    id: string,
  ): Promise<HydratedDocument<Client> | null> {
    return ClientModel.findOne(buildTenantFilter(organisationId, { _id: id })).exec();
  }

  public async update(
    organisationId: string,
    id: string,
    data: Partial<Client>,
  ): Promise<HydratedDocument<Client> | null> {
    return ClientModel.findOneAndUpdate(
      buildTenantFilter(organisationId, { _id: id }),
      { $set: data },
      { new: true, runValidators: true },
    ).exec();
  }

  public async delete(organisationId: string, id: string): Promise<boolean> {
    const result = await ClientModel.deleteOne(buildTenantFilter(organisationId, { _id: id }));
    return result.deletedCount === 1;
  }
}
