import { buildTenantFilter } from '../../common/repositories/tenant-repository.js';

import { NotificationModel } from './notification.model.js';

import type { Notification } from './notification.model.js';
import type { HydratedDocument } from 'mongoose';

export class NotificationRepository {
  public async create(
    data: Omit<Notification, 'createdAt'>,
  ): Promise<HydratedDocument<Notification>> {
    return NotificationModel.create(data);
  }
  public async list(
    organisationId: string,
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ items: Array<HydratedDocument<Notification>>; total: number; unread: number }> {
    const filter = buildTenantFilter(organisationId, { userId });
    const [items, total, unread] = await Promise.all([
      NotificationModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      NotificationModel.countDocuments(filter),
      NotificationModel.countDocuments(
        buildTenantFilter(organisationId, { userId, isRead: false }),
      ),
    ]);
    return { items, total, unread };
  }
  public async markRead(
    organisationId: string,
    userId: string,
    id: string,
  ): Promise<HydratedDocument<Notification> | null> {
    return NotificationModel.findOneAndUpdate(
      buildTenantFilter(organisationId, { _id: id, userId }),
      { $set: { isRead: true, readAt: new Date() } },
      { new: true },
    ).exec();
  }
  public async markAllRead(organisationId: string, userId: string): Promise<number> {
    const result = await NotificationModel.updateMany(
      buildTenantFilter(organisationId, { userId, isRead: false }),
      { $set: { isRead: true, readAt: new Date() } },
    );
    return result.modifiedCount;
  }
}
