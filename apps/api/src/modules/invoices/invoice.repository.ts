import { buildTenantFilter } from '../../common/repositories/tenant-repository.js';
import { UserModel } from '../users/user.model.js';

import { InvoiceCounterModel } from './invoice-counter.model.js';
import { InvoiceModel } from './invoice.model.js';

import type { Invoice } from './invoice.model.js';
import type { FilterQuery, HydratedDocument } from 'mongoose';

export interface InvoiceListOptions {
  page: number;
  limit: number;
  search?: string | undefined;
  status?: Invoice['status'] | undefined;
  clientId?: string | undefined;
  sortBy: 'issueDate' | 'dueDate' | 'invoiceNumber' | 'totalMinor' | 'status';
  sortOrder: 'asc' | 'desc';
}

export class InvoiceRepository {
  public async nextNumber(organisationId: string, year: number): Promise<string> {
    const counter = await InvoiceCounterModel.findOneAndUpdate(
      { organisationId },
      { $inc: { nextValue: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: false },
    ).exec();
    return `INV-${year}-${counter.nextValue.toString().padStart(5, '0')}`;
  }

  public create(
    data: Omit<Invoice, 'createdAt' | 'updatedAt'>,
  ): Promise<HydratedDocument<Invoice>> {
    return InvoiceModel.create(data);
  }

  public async list(
    organisationId: string,
    options: InvoiceListOptions,
  ): Promise<{ items: Array<HydratedDocument<Invoice>>; total: number }> {
    const filter: FilterQuery<Invoice> = {};
    if (options.status) filter.status = options.status;
    if (options.clientId) filter.clientId = options.clientId;
    if (options.search) {
      const search = options.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.invoiceNumber = { $regex: search, $options: 'i' };
    }
    const tenantFilter = buildTenantFilter(organisationId, filter);
    const [items, total] = await Promise.all([
      InvoiceModel.find(tenantFilter)
        .sort({ [options.sortBy]: options.sortOrder === 'asc' ? 1 : -1, _id: 1 })
        .skip((options.page - 1) * options.limit)
        .limit(options.limit)
        .exec(),
      InvoiceModel.countDocuments(tenantFilter),
    ]);
    return { items, total };
  }

  public findById(organisationId: string, id: string): Promise<HydratedDocument<Invoice> | null> {
    return InvoiceModel.findOne(buildTenantFilter(organisationId, { _id: id })).exec();
  }

  public update(
    organisationId: string,
    id: string,
    data: Partial<Invoice>,
  ): Promise<HydratedDocument<Invoice> | null> {
    return InvoiceModel.findOneAndUpdate(
      buildTenantFilter(organisationId, { _id: id }),
      { $set: data },
      { new: true, runValidators: true },
    ).exec();
  }

  public async clientUserIds(organisationId: string, clientId: string): Promise<string[]> {
    const users = await UserModel.find(
      buildTenantFilter(organisationId, { clientId, role: 'client', status: 'active' }),
    )
      .select('_id')
      .lean()
      .exec();
    return users.map((user) => user._id.toString());
  }
}
