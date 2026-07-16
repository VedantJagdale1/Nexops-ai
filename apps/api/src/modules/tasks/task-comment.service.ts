import type { TaskComment } from './task-comment.model.js';
import type { TaskCommentAuthorRecord, TaskCommentRepository } from './task-comment.repository.js';
import type { TaskService } from './task.service.js';
import type { RealtimePublisher } from '../../infrastructure/realtime/realtime.publisher.js';
import type {
  AuthenticatedUserDto,
  PaginationMeta,
  TaskCommentDto,
  TaskCommentInput,
} from '@nexops/shared';
import type { HydratedDocument } from 'mongoose';

function toTaskCommentDto(
  comment: HydratedDocument<TaskComment>,
  projectId: string,
  authors: ReadonlyMap<string, TaskCommentAuthorRecord>,
): TaskCommentDto {
  const authorId = comment.authorId.toString();
  return {
    id: comment._id.toString(),
    taskId: comment.taskId.toString(),
    projectId,
    author: authors.get(authorId) ?? {
      id: authorId,
      name: 'Former team member',
      role: 'unknown',
    },
    content: comment.content,
    ...(comment.editedAt ? { editedAt: comment.editedAt.toISOString() } : {}),
    createdAt: comment.createdAt.toISOString(),
  };
}

export class TaskCommentService {
  public constructor(
    private readonly repository: TaskCommentRepository,
    private readonly tasks: TaskService,
    private readonly realtime: RealtimePublisher,
  ) {}

  public async history(
    user: AuthenticatedUserDto,
    taskId: string,
    page: number,
    limit: number,
  ): Promise<{ items: TaskCommentDto[]; meta: PaginationMeta }> {
    const task = await this.tasks.get(user, taskId);
    const result = await this.repository.list(user.organisationId, taskId, page, limit);
    const authors = await this.repository.authors(
      user.organisationId,
      result.items.map((comment) => comment.authorId.toString()),
    );
    return {
      items: result.items.map((comment) => toTaskCommentDto(comment, task.projectId, authors)),
      meta: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  public async create(
    user: AuthenticatedUserDto,
    taskId: string,
    input: TaskCommentInput,
  ): Promise<TaskCommentDto> {
    const task = await this.tasks.get(user, taskId);
    const comment = await this.repository.create({
      organisationId: user.organisationId,
      taskId,
      authorId: user.id,
      content: input.content,
    } as unknown as Omit<TaskComment, 'createdAt' | 'updatedAt'>);
    const dto = toTaskCommentDto(
      comment,
      task.projectId,
      new Map([
        [
          user.id,
          {
            id: user.id,
            name: user.name,
            role: user.role,
            ...(user.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
          },
        ],
      ]),
    );
    this.realtime.publishTaskCommented(user.organisationId, task.projectId, dto);
    return dto;
  }
}
