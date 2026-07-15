import { Types } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';

import { TaskService } from './task.service.js';

import type { Task } from './task.model.js';
import type { TaskRepository } from './task.repository.js';
import type { ProjectService } from '../projects/project.service.js';
import type { UserRepositoryContract } from '../users/user.repository.js';
import type { AuthenticatedUserDto } from '@nexops/shared';
import type { HydratedDocument } from 'mongoose';

const organisationId = new Types.ObjectId();
const projectId = new Types.ObjectId();
const developerId = new Types.ObjectId();
const taskId = new Types.ObjectId();
const developer: AuthenticatedUserDto = {
  id: developerId.toString(),
  organisationId: organisationId.toString(),
  name: 'Dev User',
  email: 'dev@nexops.test',
  role: 'developer',
  emailVerified: true,
};
function taskDocument(): HydratedDocument<Task> {
  return {
    _id: taskId,
    organisationId,
    projectId,
    title: 'Integrate billing API',
    status: 'in_progress',
    priority: 'high',
    assigneeIds: [developerId],
    reporterId: developerId,
    loggedMinutes: 0,
    labels: [],
    checklist: [],
    position: 0,
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-10T00:00:00.000Z'),
  } as unknown as HydratedDocument<Task>;
}

describe('TaskService', () => {
  it('persists a board move with the last-seen timestamp', async () => {
    const moved = {
      ...taskDocument(),
      status: 'in_review',
      position: 2,
    } as unknown as HydratedDocument<Task>;
    const tasks = {
      findById: vi.fn().mockResolvedValue(taskDocument()),
      move: vi.fn().mockResolvedValue(moved),
      refreshProjectProgress: vi.fn().mockResolvedValue(undefined),
    } as unknown as TaskRepository;
    const projects = {
      requireAccessible: vi.fn().mockResolvedValue({}),
    } as unknown as ProjectService;
    const users = {
      membersBelongToOrganisation: vi.fn().mockResolvedValue(true),
    } as unknown as UserRepositoryContract;
    const service = new TaskService(tasks, projects, users);
    const move = vi.spyOn(tasks, 'move');
    const expectedUpdatedAt = '2026-07-10T00:00:00.000Z';
    const result = await service.move(developer, taskId.toString(), {
      status: 'in_review',
      position: 2,
      expectedUpdatedAt,
    });
    expect(result).toMatchObject({ status: 'in_review', position: 2 });
    expect(move).toHaveBeenCalledWith(
      developer.organisationId,
      taskId.toString(),
      new Date(expectedUpdatedAt),
      'in_review',
      2,
    );
  });

  it('returns a conflict when a concurrent task update wins', async () => {
    const tasks = {
      findById: vi.fn().mockResolvedValue(taskDocument()),
      move: vi.fn().mockResolvedValue(null),
      refreshProjectProgress: vi.fn().mockResolvedValue(undefined),
    } as unknown as TaskRepository;
    const projects = {
      requireAccessible: vi.fn().mockResolvedValue({}),
    } as unknown as ProjectService;
    await expect(
      new TaskService(tasks, projects, {
        membersBelongToOrganisation: vi.fn().mockResolvedValue(true),
      } as unknown as UserRepositoryContract).move(developer, taskId.toString(), {
        status: 'completed',
        position: 0,
        expectedUpdatedAt: '2026-07-10T00:00:00.000Z',
      }),
    ).rejects.toMatchObject({ code: 'TASK_UPDATE_CONFLICT', statusCode: 409 });
  });
});
