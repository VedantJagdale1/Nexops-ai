import { buildTenantFilter } from '../../common/repositories/tenant-repository.js';
import { UserModel } from '../users/user.model.js';

import { ProjectMessageModel } from './project-message.model.js';

import type { ProjectMessage } from './project-message.model.js';
import type { HydratedDocument } from 'mongoose';

export interface ChatParticipantRecord {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
}

export class ChatRepository {
  public create(
    data: Omit<ProjectMessage, 'createdAt' | 'updatedAt'>,
  ): Promise<HydratedDocument<ProjectMessage>> {
    return ProjectMessageModel.create(data);
  }

  public async list(
    organisationId: string,
    projectId: string,
    page: number,
    limit: number,
  ): Promise<{ items: Array<HydratedDocument<ProjectMessage>>; total: number }> {
    const filter = buildTenantFilter(organisationId, { projectId });
    const [items, total] = await Promise.all([
      ProjectMessageModel.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      ProjectMessageModel.countDocuments(filter),
    ]);
    return { items: items.reverse(), total };
  }

  public async participants(
    organisationId: string,
    userIds: readonly string[],
  ): Promise<Map<string, ChatParticipantRecord>> {
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
