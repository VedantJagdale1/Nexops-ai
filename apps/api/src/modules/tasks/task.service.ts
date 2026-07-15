import { AppError } from '../../common/errors/app-error.js';
import { noopRealtimePublisher } from '../../infrastructure/realtime/realtime.publisher.js';

import type { Task } from './task.model.js';
import type { TaskRepository } from './task.repository.js';
import type { RealtimePublisher } from '../../infrastructure/realtime/realtime.publisher.js';
import type { NotificationService } from '../notifications/notification.service.js';
import type { ProjectService } from '../projects/project.service.js';
import type { UserRepositoryContract } from '../users/user.repository.js';
import type {
  AuthenticatedUserDto,
  MoveTaskInput,
  TaskDto,
  TaskInput,
  UpdateTaskInput,
} from '@nexops/shared';
import type { HydratedDocument } from 'mongoose';

export function toTaskDto(task: HydratedDocument<Task>): TaskDto {
  return {
    id: task._id.toString(),
    projectId: task.projectId.toString(),
    title: task.title,
    ...(task.description ? { description: task.description } : {}),
    status: task.status,
    priority: task.priority,
    assigneeIds: task.assigneeIds.map(String),
    reporterId: task.reporterId.toString(),
    ...(task.dueDate ? { dueDate: task.dueDate.toISOString().slice(0, 10) } : {}),
    ...(task.estimatedMinutes !== undefined ? { estimatedMinutes: task.estimatedMinutes } : {}),
    loggedMinutes: task.loggedMinutes,
    labels: task.labels,
    checklist: task.checklist.map((item) => ({
      id: item._id.toString(),
      text: item.text,
      completed: item.completed,
    })),
    position: task.position,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export class TaskService {
  public constructor(
    private readonly repository: TaskRepository,
    private readonly projects: ProjectService,
    private readonly users: UserRepositoryContract,
    private readonly notifications?: NotificationService,
    private readonly realtime: RealtimePublisher = noopRealtimePublisher,
  ) {}

  public async list(
    user: AuthenticatedUserDto,
    query: {
      projectId: string;
      search?: string | undefined;
      status?: Task['status'] | undefined;
      assigneeId?: string | undefined;
    },
  ): Promise<TaskDto[]> {
    await this.projects.requireAccessible(user, query.projectId);
    return (await this.repository.list(user.organisationId, query.projectId, query)).map(toTaskDto);
  }

  public async get(user: AuthenticatedUserDto, id: string): Promise<TaskDto> {
    return toTaskDto(await this.requireAccessible(user, id));
  }

  public async create(user: AuthenticatedUserDto, input: TaskInput): Promise<TaskDto> {
    await this.projects.requireAccessible(user, input.projectId);
    if (
      !(await this.users.membersBelongToOrganisation(user.organisationId, input.assigneeIds ?? []))
    )
      throw new AppError({
        code: 'TASK_ASSIGNEE_INVALID',
        message: 'Every assignee must belong to this organisation',
        statusCode: 422,
      });
    const status = input.status ?? 'backlog';
    const position = await this.repository.nextPosition(
      user.organisationId,
      input.projectId,
      status,
    );
    const task = await this.repository.create({
      organisationId: user.organisationId,
      projectId: input.projectId,
      title: input.title,
      ...(input.description ? { description: input.description } : {}),
      status,
      priority: input.priority ?? 'medium',
      assigneeIds: input.assigneeIds ?? [],
      reporterId: user.id,
      ...(input.dueDate ? { dueDate: new Date(`${input.dueDate}T00:00:00.000Z`) } : {}),
      ...(input.estimatedMinutes !== undefined && input.estimatedMinutes !== null
        ? { estimatedMinutes: input.estimatedMinutes }
        : {}),
      loggedMinutes: 0,
      labels: input.labels ?? [],
      checklist: (input.checklist ?? []).map((item) => ({ ...item })),
      position,
    } as unknown as Omit<Task, 'createdAt' | 'updatedAt'>);
    await this.repository.refreshProjectProgress(user.organisationId, input.projectId);
    await this.notifyAssignments(
      user,
      task._id.toString(),
      task.title,
      task.assigneeIds.map(String).filter((assigneeId) => assigneeId !== user.id),
    );
    const dto = toTaskDto(task);
    this.realtime.publishTaskUpdated(user.organisationId, input.projectId, dto);
    return dto;
  }

  public async update(
    user: AuthenticatedUserDto,
    id: string,
    input: UpdateTaskInput,
  ): Promise<TaskDto> {
    const current = await this.requireManageable(user, id);
    if (
      input.assigneeIds &&
      !(await this.users.membersBelongToOrganisation(user.organisationId, input.assigneeIds))
    )
      throw new AppError({
        code: 'TASK_ASSIGNEE_INVALID',
        message: 'Every assignee must belong to this organisation',
        statusCode: 422,
      });
    const data = {
      ...input,
      ...(input.dueDate !== undefined
        ? { dueDate: input.dueDate ? new Date(`${input.dueDate}T00:00:00.000Z`) : undefined }
        : {}),
    } as unknown as Partial<Task>;
    const task = await this.repository.update(user.organisationId, id, data);
    if (!task) throw this.notFound();
    if (input.status)
      await this.repository.refreshProjectProgress(user.organisationId, task.projectId.toString());
    if (input.assigneeIds) {
      const existing = new Set(current.assigneeIds.map(String));
      await this.notifyAssignments(
        user,
        task._id.toString(),
        task.title,
        input.assigneeIds.filter(
          (assigneeId) => assigneeId !== user.id && !existing.has(assigneeId),
        ),
      );
    }
    const dto = toTaskDto(task);
    this.realtime.publishTaskUpdated(user.organisationId, task.projectId.toString(), dto);
    return dto;
  }

  public async move(
    user: AuthenticatedUserDto,
    id: string,
    input: MoveTaskInput,
  ): Promise<TaskDto> {
    await this.requireManageable(user, id);
    const task = await this.repository.move(
      user.organisationId,
      id,
      new Date(input.expectedUpdatedAt),
      input.status,
      input.position,
    );
    if (!task)
      throw new AppError({
        code: 'TASK_UPDATE_CONFLICT',
        message: 'This task changed elsewhere. The board has been refreshed.',
        statusCode: 409,
      });
    await this.repository.refreshProjectProgress(user.organisationId, task.projectId.toString());
    const dto = toTaskDto(task);
    this.realtime.publishTaskUpdated(user.organisationId, task.projectId.toString(), dto);
    return dto;
  }

  public async delete(user: AuthenticatedUserDto, id: string): Promise<void> {
    const task = await this.requireManageable(user, id);
    if (!(await this.repository.delete(user.organisationId, id))) throw this.notFound();
    await this.repository.refreshProjectProgress(user.organisationId, task.projectId.toString());
  }

  private async requireAccessible(
    user: AuthenticatedUserDto,
    id: string,
  ): Promise<HydratedDocument<Task>> {
    const task = await this.repository.findById(user.organisationId, id);
    if (!task) throw this.notFound();
    await this.projects.requireAccessible(user, task.projectId.toString());
    return task;
  }

  private async requireManageable(
    user: AuthenticatedUserDto,
    id: string,
  ): Promise<HydratedDocument<Task>> {
    const task = await this.requireAccessible(user, id);
    if (
      user.role === 'developer' &&
      !task.assigneeIds.some((assigneeId) => assigneeId.toString() === user.id)
    )
      throw new AppError({
        code: 'TASK_MANAGEMENT_DENIED',
        message: 'Developers can update only tasks assigned to them',
        statusCode: 403,
      });
    return task;
  }

  private notFound(): AppError {
    return new AppError({ code: 'TASK_NOT_FOUND', message: 'Task not found', statusCode: 404 });
  }

  private async notifyAssignments(
    user: AuthenticatedUserDto,
    taskId: string,
    taskTitle: string,
    userIds: string[],
  ): Promise<void> {
    const notifications = this.notifications;
    if (!notifications) return;
    await Promise.all(
      userIds.map((userId) =>
        notifications.create({
          organisationId: user.organisationId,
          userId,
          type: 'task_assignment',
          title: 'Task assigned to you',
          message: taskTitle,
          entityType: 'task',
          entityId: taskId,
        }),
      ),
    );
  }
}
