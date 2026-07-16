import { Types } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';

import { TaskCommentService } from './task-comment.service.js';

import type { TaskComment } from './task-comment.model.js';
import type { TaskCommentRepository } from './task-comment.repository.js';
import type { TaskService } from './task.service.js';
import type { RealtimePublisher } from '../../infrastructure/realtime/realtime.publisher.js';
import type { AuthenticatedUserDto, TaskDto } from '@nexops/shared';
import type { HydratedDocument } from 'mongoose';

const organisationId = new Types.ObjectId();
const projectId = new Types.ObjectId();
const taskId = new Types.ObjectId();
const authorId = new Types.ObjectId();
const commentId = new Types.ObjectId();

const user: AuthenticatedUserDto = {
  id: authorId.toString(),
  organisationId: organisationId.toString(),
  name: 'Realtime Developer',
  email: 'realtime@nexops.test',
  role: 'developer',
  emailVerified: true,
};

const task = {
  id: taskId.toString(),
  projectId: projectId.toString(),
  title: 'Review Socket.IO events',
  status: 'in_review',
  priority: 'high',
  assigneeIds: [authorId.toString()],
  reporterId: authorId.toString(),
  loggedMinutes: 0,
  labels: ['realtime'],
  checklist: [],
  position: 0,
  createdAt: '2026-07-16T07:00:00.000Z',
  updatedAt: '2026-07-16T07:00:00.000Z',
} satisfies TaskDto;

function commentDocument(): HydratedDocument<TaskComment> {
  return {
    _id: commentId,
    organisationId,
    taskId,
    authorId,
    content: 'The board update is visible in both windows.',
    createdAt: new Date('2026-07-16T07:30:00.000Z'),
    updatedAt: new Date('2026-07-16T07:30:00.000Z'),
  } as unknown as HydratedDocument<TaskComment>;
}

describe('TaskCommentService', () => {
  it('scopes comment history through task access and bulk-loads authors', async () => {
    const getTask = vi.fn().mockResolvedValue(task);
    const list = vi.fn().mockResolvedValue({ items: [commentDocument()], total: 1 });
    const authors = vi
      .fn()
      .mockResolvedValue(new Map([[user.id, { id: user.id, name: user.name, role: user.role }]]));
    const service = new TaskCommentService(
      { list, authors } as unknown as TaskCommentRepository,
      { get: getTask } as unknown as TaskService,
      {} as RealtimePublisher,
    );

    const result = await service.history(user, task.id, 1, 50);

    expect(getTask).toHaveBeenCalledWith(user, task.id);
    expect(list).toHaveBeenCalledWith(user.organisationId, task.id, 1, 50);
    expect(authors).toHaveBeenCalledWith(user.organisationId, [user.id]);
    expect(result.items[0]).toMatchObject({ projectId: task.projectId, author: { id: user.id } });
  });

  it('derives tenant and author identity before broadcasting a persisted comment', async () => {
    const createComment = vi.fn().mockResolvedValue(commentDocument());
    const publishTaskCommented = vi.fn();
    const service = new TaskCommentService(
      { create: createComment } as unknown as TaskCommentRepository,
      { get: vi.fn().mockResolvedValue(task) } as unknown as TaskService,
      { publishTaskCommented } as unknown as RealtimePublisher,
    );

    const result = await service.create(user, task.id, {
      content: 'The board update is visible in both windows.',
    });

    expect(createComment).toHaveBeenCalledWith(
      expect.objectContaining({
        organisationId: user.organisationId,
        taskId: task.id,
        authorId: user.id,
      }),
    );
    expect(publishTaskCommented).toHaveBeenCalledWith(user.organisationId, task.projectId, result);
  });
});
