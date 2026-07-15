import { buildTenantFilter } from '../../common/repositories/tenant-repository.js';

import { ProjectModel } from './project.model.js';

import type { Project } from './project.model.js';
import type { FilterQuery, HydratedDocument } from 'mongoose';

export interface ProjectListOptions {
  page: number;
  limit: number;
  search?: string | undefined;
  clientId?: string | undefined;
  status?: Project['status'] | undefined;
  priority?: Project['priority'] | undefined;
  sortBy: 'name' | 'key' | 'status' | 'priority' | 'dueDate' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
  access?: { role: 'client'; clientId: string } | { role: 'member'; userId: string };
}

export class ProjectRepository {
  public async create(
    data: Omit<Project, 'createdAt' | 'updatedAt'>,
  ): Promise<HydratedDocument<Project>> {
    return ProjectModel.create(data);
  }

  public async list(
    organisationId: string,
    options: ProjectListOptions,
  ): Promise<{ items: Array<HydratedDocument<Project>>; total: number }> {
    const filter: FilterQuery<Project> = {};
    if (options.clientId) filter.clientId = options.clientId;
    if (options.status) filter.status = options.status;
    if (options.priority) filter.priority = options.priority;
    if (options.search) {
      const escaped = options.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { key: { $regex: escaped, $options: 'i' } },
      ];
    }
    if (options.access?.role === 'client') filter.clientId = options.access.clientId;
    if (options.access?.role === 'member') {
      filter.$and = [
        {
          $or: [{ projectManagerId: options.access.userId }, { memberIds: options.access.userId }],
        },
      ];
    }
    const tenantFilter = buildTenantFilter(organisationId, filter);
    const [items, total] = await Promise.all([
      ProjectModel.find(tenantFilter)
        .sort({ [options.sortBy]: options.sortOrder === 'asc' ? 1 : -1, _id: 1 })
        .skip((options.page - 1) * options.limit)
        .limit(options.limit)
        .exec(),
      ProjectModel.countDocuments(tenantFilter),
    ]);
    return { items, total };
  }

  public async findById(
    organisationId: string,
    id: string,
  ): Promise<HydratedDocument<Project> | null> {
    return ProjectModel.findOne(buildTenantFilter(organisationId, { _id: id })).exec();
  }

  public async keyExists(organisationId: string, key: string, exceptId?: string): Promise<boolean> {
    const filter: FilterQuery<Project> = { key };
    if (exceptId) filter._id = { $ne: exceptId };
    return (await ProjectModel.exists(buildTenantFilter(organisationId, filter))) !== null;
  }

  public async update(
    organisationId: string,
    id: string,
    data: Partial<Project>,
  ): Promise<HydratedDocument<Project> | null> {
    return ProjectModel.findOneAndUpdate(
      buildTenantFilter(organisationId, { _id: id }),
      { $set: data },
      { new: true, runValidators: true },
    ).exec();
  }

  public async delete(organisationId: string, id: string): Promise<boolean> {
    const result = await ProjectModel.deleteOne(buildTenantFilter(organisationId, { _id: id }));
    return result.deletedCount === 1;
  }
}
