import { paginationQuerySchema } from '@nexops/shared';

import { buildTenantFilter } from '../../common/repositories/tenant-repository.js';

import { UserModel } from './user.model.js';

import type { TeamMemberDto } from '@nexops/shared';
import type { Request, Response } from 'express';

export async function listUsers(request: Request, response: Response): Promise<void> {
  if (!request.auth) return;
  const query = paginationQuerySchema.parse(request.query);
  const filter = query.search
    ? {
        $or: [
          { name: { $regex: query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
          { email: { $regex: query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
        ],
      }
    : {};
  const tenantFilter = buildTenantFilter(request.auth.organisationId, filter);
  const [users, total] = await Promise.all([
    UserModel.find(tenantFilter)
      .sort({ name: 1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .exec(),
    UserModel.countDocuments(tenantFilter),
  ]);
  const data: TeamMemberDto[] = users.map((user) => ({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    ...(user.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
    role: user.role,
    status: user.status,
  }));
  response.json({
    success: true,
    data,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  });
}
