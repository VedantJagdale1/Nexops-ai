import { AppError } from '../../common/errors/app-error.js';
import { noopRealtimePublisher } from '../../infrastructure/realtime/realtime.publisher.js';

import type { Notification } from './notification.model.js';
import type { NotificationRepository } from './notification.repository.js';
import type { RealtimePublisher } from '../../infrastructure/realtime/realtime.publisher.js';
import type { AuthenticatedUserDto, NotificationDto, PaginationMeta } from '@nexops/shared';
import type { HydratedDocument } from 'mongoose';

function toDto(item: HydratedDocument<Notification>): NotificationDto {
  return {
    id: item._id.toString(),
    type: item.type,
    title: item.title,
    message: item.message,
    ...(item.entityType ? { entityType: item.entityType } : {}),
    ...(item.entityId ? { entityId: item.entityId.toString() } : {}),
    isRead: item.isRead,
    ...(item.readAt ? { readAt: item.readAt.toISOString() } : {}),
    createdAt: item.createdAt.toISOString(),
  };
}
export class NotificationService {
  public constructor(
    private readonly repository: NotificationRepository,
    private readonly realtime: RealtimePublisher = noopRealtimePublisher,
  ) {}
  public async create(data: {
    organisationId: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    entityType?: string;
    entityId?: string;
  }): Promise<NotificationDto> {
    const item = await this.repository.create({ ...data, isRead: false } as unknown as Omit<
      Notification,
      'createdAt'
    >);
    const dto = toDto(item);
    this.realtime.publishNotification(data.organisationId, data.userId, dto);
    return dto;
  }
  public async list(
    user: AuthenticatedUserDto,
    page: number,
    limit: number,
  ): Promise<{ items: NotificationDto[]; meta: PaginationMeta & { unread: number } }> {
    const result = await this.repository.list(user.organisationId, user.id, page, limit);
    return {
      items: result.items.map(toDto),
      meta: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
        unread: result.unread,
      },
    };
  }
  public async markRead(user: AuthenticatedUserDto, id: string): Promise<NotificationDto> {
    const item = await this.repository.markRead(user.organisationId, user.id, id);
    if (!item)
      throw new AppError({
        code: 'NOTIFICATION_NOT_FOUND',
        message: 'Notification not found',
        statusCode: 404,
      });
    return toDto(item);
  }
  public markAllRead(user: AuthenticatedUserDto): Promise<number> {
    return this.repository.markAllRead(user.organisationId, user.id);
  }
}
