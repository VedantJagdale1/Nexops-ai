import { Types } from '../../common/mongoose.js';
import { buildTenantFilter } from '../../common/repositories/tenant-repository.js';
import { ProjectModel } from '../projects/project.model.js';

import { TaskModel } from './task.model.js';

import type { Task } from './task.model.js';
import type { FilterQuery, HydratedDocument } from 'mongoose';

export class TaskRepository {
  public async create(
    data: Omit<Task, 'createdAt' | 'updatedAt'>,
  ): Promise<HydratedDocument<Task>> {
    return TaskModel.create(data);
  }

  public async nextPosition(
    organisationId: string,
    projectId: string,
    status: Task['status'],
  ): Promise<number> {
    const task = await TaskModel.findOne(buildTenantFilter(organisationId, { projectId, status }))
      .sort({ position: -1 })
      .select('position')
      .lean()
      .exec();
    return task ? task.position + 1 : 0;
  }

  public async list(
    organisationId: string,
    projectId: string,
    options: {
      search?: string | undefined;
      status?: Task['status'] | undefined;
      assigneeId?: string | undefined;
    },
  ): Promise<Array<HydratedDocument<Task>>> {
    const filter: FilterQuery<Task> = { projectId };
    if (options.status) filter.status = options.status;
    if (options.assigneeId) filter.assigneeIds = options.assigneeId;
    if (options.search) {
      const escaped = options.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
      ];
    }
    return TaskModel.find(buildTenantFilter(organisationId, filter))
      .sort({ status: 1, position: 1, _id: 1 })
      .exec();
  }

  public async findById(
    organisationId: string,
    id: string,
  ): Promise<HydratedDocument<Task> | null> {
    return TaskModel.findOne(buildTenantFilter(organisationId, { _id: id })).exec();
  }

  public async update(
    organisationId: string,
    id: string,
    data: Partial<Task>,
  ): Promise<HydratedDocument<Task> | null> {
    return TaskModel.findOneAndUpdate(
      buildTenantFilter(organisationId, { _id: id }),
      { $set: data },
      { new: true, runValidators: true },
    ).exec();
  }

  public async move(
    organisationId: string,
    id: string,
    expectedUpdatedAt: Date,
    status: Task['status'],
    position: number,
  ): Promise<HydratedDocument<Task> | null> {
    const moved = await TaskModel.findOneAndUpdate(
      buildTenantFilter(organisationId, { _id: id, updatedAt: expectedUpdatedAt }),
      { $set: { status, position } },
      { new: true, runValidators: true },
    ).exec();
    if (!moved) return null;
    const peers = await TaskModel.find(
      buildTenantFilter(organisationId, {
        projectId: moved.projectId,
        status,
        _id: { $ne: moved._id },
      }),
    )
      .sort({ position: 1, updatedAt: 1, _id: 1 })
      .distinct('_id');
    const bounded = Math.min(position, peers.length);
    peers.splice(bounded, 0, moved._id);
    if (peers.length > 0) {
      await TaskModel.bulkWrite(
        peers.map((peerId, index) => ({
          updateOne: {
            filter: { _id: peerId, organisationId: moved.organisationId },
            update: { $set: { position: index } },
          },
        })),
        { ordered: true },
      );
    }
    moved.position = bounded;
    return moved;
  }

  public async delete(organisationId: string, id: string): Promise<boolean> {
    const result = await TaskModel.deleteOne(buildTenantFilter(organisationId, { _id: id }));
    return result.deletedCount === 1;
  }

  public async refreshProjectProgress(organisationId: string, projectId: string): Promise<void> {
    const [counts] = await TaskModel.aggregate<{ total: number; completed: number }>([
      { $match: buildTenantFilter(organisationId, { projectId: new Types.ObjectId(projectId) }) },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        },
      },
    ]);
    const progress =
      counts && counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0;
    await ProjectModel.updateOne(buildTenantFilter(organisationId, { _id: projectId }), {
      $set: { progress },
    });
  }
}
