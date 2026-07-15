import { AppError } from '../../common/errors/app-error.js';
import { canAccessProject } from '../../common/policies/entity-access.js';

import type { Project } from './project.model.js';
import type { ProjectListOptions, ProjectRepository } from './project.repository.js';
import type { ClientRepository } from '../clients/client.repository.js';
import type { NotificationService } from '../notifications/notification.service.js';
import type { UserRepositoryContract } from '../users/user.repository.js';
import type {
  AuthenticatedUserDto,
  PaginationMeta,
  ProjectDto,
  ProjectInput,
  UpdateProjectInput,
} from '@nexops/shared';
import type { HydratedDocument } from 'mongoose';

export function toProjectDto(project: HydratedDocument<Project>): ProjectDto {
  return {
    id: project._id.toString(),
    clientId: project.clientId.toString(),
    name: project.name,
    key: project.key,
    ...(project.description ? { description: project.description } : {}),
    status: project.status,
    priority: project.priority,
    ...(project.projectManagerId ? { projectManagerId: project.projectManagerId.toString() } : {}),
    memberIds: project.memberIds.map(String),
    ...(project.startDate ? { startDate: project.startDate.toISOString().slice(0, 10) } : {}),
    ...(project.dueDate ? { dueDate: project.dueDate.toISOString().slice(0, 10) } : {}),
    ...(project.estimatedBudgetMinor !== undefined
      ? { estimatedBudgetMinor: project.estimatedBudgetMinor }
      : {}),
    actualCostMinor: project.actualCostMinor,
    progress: project.progress,
    tags: project.tags,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

export class ProjectService {
  public constructor(
    private readonly repository: ProjectRepository,
    private readonly clients: ClientRepository,
    private readonly users: UserRepositoryContract,
    private readonly notifications?: NotificationService,
  ) {}

  public async list(
    user: AuthenticatedUserDto,
    options: ProjectListOptions,
  ): Promise<{ items: ProjectDto[]; meta: PaginationMeta }> {
    const access =
      user.role === 'client' && user.clientId
        ? { role: 'client' as const, clientId: user.clientId }
        : user.role === 'project_manager' || user.role === 'developer'
          ? { role: 'member' as const, userId: user.id }
          : undefined;
    const page = await this.repository.list(user.organisationId, {
      ...options,
      ...(access ? { access } : {}),
    });
    return {
      items: page.items.map(toProjectDto),
      meta: {
        page: options.page,
        limit: options.limit,
        total: page.total,
        totalPages: Math.ceil(page.total / options.limit),
      },
    };
  }

  public async get(user: AuthenticatedUserDto, id: string): Promise<ProjectDto> {
    return toProjectDto(await this.requireAccessible(user, id));
  }

  public async create(user: AuthenticatedUserDto, input: ProjectInput): Promise<ProjectDto> {
    const client = await this.clients.findById(user.organisationId, input.clientId);
    if (!client)
      throw new AppError({
        code: 'CLIENT_NOT_FOUND',
        message: 'Client not found',
        statusCode: 404,
      });
    const key = input.key.toUpperCase();
    if (await this.repository.keyExists(user.organisationId, key))
      throw new AppError({
        code: 'PROJECT_KEY_EXISTS',
        message: 'Project key is already in use',
        statusCode: 409,
      });
    const memberIds = Array.from(
      new Set([
        ...(input.memberIds ?? []),
        ...(input.projectManagerId ? [input.projectManagerId] : []),
        ...(user.role === 'project_manager' ? [user.id] : []),
      ]),
    );
    if (!(await this.users.membersBelongToOrganisation(user.organisationId, memberIds)))
      throw new AppError({
        code: 'PROJECT_MEMBER_INVALID',
        message: 'Every project member must belong to this organisation',
        statusCode: 422,
      });
    const project = await this.repository.create({
      organisationId: user.organisationId,
      clientId: input.clientId,
      name: input.name,
      key,
      ...(input.description ? { description: input.description } : {}),
      status: input.status ?? 'planning',
      priority: input.priority ?? 'medium',
      ...(input.projectManagerId
        ? { projectManagerId: input.projectManagerId }
        : user.role === 'project_manager'
          ? { projectManagerId: user.id }
          : {}),
      memberIds,
      ...(input.startDate ? { startDate: new Date(`${input.startDate}T00:00:00.000Z`) } : {}),
      ...(input.dueDate ? { dueDate: new Date(`${input.dueDate}T00:00:00.000Z`) } : {}),
      ...(input.estimatedBudgetMinor !== undefined && input.estimatedBudgetMinor !== null
        ? { estimatedBudgetMinor: input.estimatedBudgetMinor }
        : {}),
      actualCostMinor: 0,
      progress: 0,
      tags: input.tags ?? [],
      milestones: [],
      createdBy: user.id,
    } as unknown as Omit<Project, 'createdAt' | 'updatedAt'>);
    await this.notifyAssignments(
      user,
      project._id.toString(),
      project.name,
      memberIds.filter((memberId) => memberId !== user.id),
    );
    return toProjectDto(project);
  }

  public async update(
    user: AuthenticatedUserDto,
    id: string,
    input: UpdateProjectInput,
  ): Promise<ProjectDto> {
    await this.requireManageable(user, id);
    if (input.clientId && !(await this.clients.findById(user.organisationId, input.clientId)))
      throw new AppError({
        code: 'CLIENT_NOT_FOUND',
        message: 'Client not found',
        statusCode: 404,
      });
    if (input.key && (await this.repository.keyExists(user.organisationId, input.key, id)))
      throw new AppError({
        code: 'PROJECT_KEY_EXISTS',
        message: 'Project key is already in use',
        statusCode: 409,
      });
    const memberIds = Array.from(
      new Set([
        ...(input.memberIds ?? []),
        ...(input.projectManagerId ? [input.projectManagerId] : []),
      ]),
    );
    if (
      memberIds.length > 0 &&
      !(await this.users.membersBelongToOrganisation(user.organisationId, memberIds))
    )
      throw new AppError({
        code: 'PROJECT_MEMBER_INVALID',
        message: 'Every project member must belong to this organisation',
        statusCode: 422,
      });
    const data: Partial<Project> = {
      ...input,
      ...(input.startDate !== undefined
        ? { startDate: input.startDate ? new Date(`${input.startDate}T00:00:00.000Z`) : undefined }
        : {}),
      ...(input.dueDate !== undefined
        ? { dueDate: input.dueDate ? new Date(`${input.dueDate}T00:00:00.000Z`) : undefined }
        : {}),
    } as unknown as Partial<Project>;
    const project = await this.repository.update(user.organisationId, id, data);
    if (!project) throw this.notFound();
    return toProjectDto(project);
  }

  public async delete(user: AuthenticatedUserDto, id: string): Promise<void> {
    await this.requireManageable(user, id);
    if (!(await this.repository.delete(user.organisationId, id))) throw this.notFound();
  }

  public async requireAccessible(
    user: AuthenticatedUserDto,
    id: string,
  ): Promise<HydratedDocument<Project>> {
    const project = await this.repository.findById(user.organisationId, id);
    if (
      !project ||
      !canAccessProject(user, {
        organisationId: project.organisationId.toString(),
        clientId: project.clientId.toString(),
        ...(project.projectManagerId
          ? { projectManagerId: project.projectManagerId.toString() }
          : {}),
        memberIds: project.memberIds.map(String),
      })
    )
      throw this.notFound();
    return project;
  }

  private async requireManageable(
    user: AuthenticatedUserDto,
    id: string,
  ): Promise<HydratedDocument<Project>> {
    const project = await this.requireAccessible(user, id);
    if (user.role === 'project_manager' && project.projectManagerId?.toString() !== user.id)
      throw new AppError({
        code: 'PROJECT_MANAGEMENT_DENIED',
        message: 'Only the assigned project manager can manage this project',
        statusCode: 403,
      });
    return project;
  }

  private notFound(): AppError {
    return new AppError({
      code: 'PROJECT_NOT_FOUND',
      message: 'Project not found',
      statusCode: 404,
    });
  }

  private async notifyAssignments(
    user: AuthenticatedUserDto,
    projectId: string,
    projectName: string,
    userIds: string[],
  ): Promise<void> {
    const notifications = this.notifications;
    if (!notifications) return;
    await Promise.all(
      userIds.map((userId) =>
        notifications.create({
          organisationId: user.organisationId,
          userId,
          type: 'project_assignment',
          title: 'You were assigned to a project',
          message: projectName,
          entityType: 'project',
          entityId: projectId,
        }),
      ),
    );
  }
}
