import { buildTenantFilter } from '../../common/repositories/tenant-repository.js';
import { UserModel } from '../users/user.model.js';

import { TaskCommentModel } from './task-comment.model.js';

import type { TaskComment } from './task-comment.model.js';
import type { HydratedDocument } from 'mongoose';

export interface TaskCommentAuthorRecord {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
}

export class TaskCommentRepository {
  public create(
    data: Omit<TaskComment, 'createdAt' | 'updatedAt'>,
  ): Promise<HydratedDocument<TaskComment>> {
    return TaskCommentModel.create(data);
  }

  public async list(
    organisationId: string,
    taskId: string,
    page: number,
    limit: number,
  ): Promise<{ items: Array<HydratedDocument<TaskComment>>; total: number }> {
    const filter = buildTenantFilter(organisationId, { taskId });
    const [items, total] = await Promise.all([
      TaskCommentModel.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      TaskCommentModel.countDocuments(filter),
    ]);
    return { items: items.reverse(), total };
  }

  public async authors(
    organisationId: string,
    userIds: readonly string[],
  ): Promise<Map<string, TaskCommentAuthorRecord>> {
    const uniqueIds = Array.from(new Set(userIds));
    if (uniqueIds.length === 0) return new Map();
    const users = await UserModel.find(
      buildTenantFilter(organisationId, { _id: { $in: uniqueIds } }),
    )
      .select('name role avatarUrl')
      .lean()
      .exec();
    return new Map(
      users.map((user) => [
        user._id.toString(),
        {
          id: user._id.toString(),
          name: user.name,
          role: user.role,
          ...(user.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
        },
      ]),
    );
  }
}
