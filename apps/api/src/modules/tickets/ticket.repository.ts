import { buildTenantFilter } from '../../common/repositories/tenant-repository.js';

import { TicketMessageModel } from './ticket-message.model.js';
import { TicketModel } from './ticket.model.js';

import type { TicketMessage } from './ticket-message.model.js';
import type { Ticket } from './ticket.model.js';
import type { FilterQuery, HydratedDocument } from 'mongoose';
export interface TicketListOptions {
  page: number;
  limit: number;
  search?: string | undefined;
  status?: Ticket['status'] | undefined;
  priority?: Ticket['priority'] | undefined;
  clientId?: string | undefined;
  sortBy: 'createdAt' | 'updatedAt' | 'priority' | 'status' | 'slaDeadline';
  sortOrder: 'asc' | 'desc';
}
export class TicketRepository {
  public create(data: Omit<Ticket, 'createdAt' | 'updatedAt'>): Promise<HydratedDocument<Ticket>> {
    return TicketModel.create(data);
  }
  public async list(
    organisationId: string,
    options: TicketListOptions,
  ): Promise<{ items: Array<HydratedDocument<Ticket>>; total: number }> {
    const filter: FilterQuery<Ticket> = {};
    if (options.status) filter.status = options.status;
    if (options.priority) filter.priority = options.priority;
    if (options.clientId) filter.clientId = options.clientId;
    if (options.search) {
      const search = options.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    const tenant = buildTenantFilter(organisationId, filter);
    const [items, total] = await Promise.all([
      TicketModel.find(tenant)
        .sort({ [options.sortBy]: options.sortOrder === 'asc' ? 1 : -1, _id: 1 })
        .skip((options.page - 1) * options.limit)
        .limit(options.limit)
        .exec(),
      TicketModel.countDocuments(tenant),
    ]);
    return { items, total };
  }
  public findById(organisationId: string, id: string): Promise<HydratedDocument<Ticket> | null> {
    return TicketModel.findOne(buildTenantFilter(organisationId, { _id: id })).exec();
  }
  public update(
    organisationId: string,
    id: string,
    data: Partial<Ticket>,
  ): Promise<HydratedDocument<Ticket> | null> {
    const setValues = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    );
    const unsetValues = Object.fromEntries(
      Object.entries(data)
        .filter(([, value]) => value === undefined)
        .map(([key]) => [key, 1]),
    );
    return TicketModel.findOneAndUpdate(
      buildTenantFilter(organisationId, { _id: id }),
      {
        $set: setValues,
        ...(Object.keys(unsetValues).length > 0 ? { $unset: unsetValues } : {}),
      },
      { new: true, runValidators: true },
    ).exec();
  }
  public createMessage(
    data: Omit<TicketMessage, 'createdAt' | 'updatedAt'>,
  ): Promise<HydratedDocument<TicketMessage>> {
    return TicketMessageModel.create(data);
  }
  public listMessages(
    organisationId: string,
    ticketId: string,
    includeInternal: boolean,
  ): Promise<Array<HydratedDocument<TicketMessage>>> {
    return TicketMessageModel.find(
      buildTenantFilter(organisationId, {
        ticketId,
        ...(includeInternal ? {} : { internal: false }),
      }),
    )
      .sort({ createdAt: 1 })
      .exec();
  }
}
