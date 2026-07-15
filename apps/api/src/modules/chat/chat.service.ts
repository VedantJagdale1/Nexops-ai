import { AppError } from '../../common/errors/app-error.js';

import type { ChatParticipantRecord, ChatRepository } from './chat.repository.js';
import type { ProjectMessage } from './project-message.model.js';
import type { RealtimePublisher } from '../../infrastructure/realtime/realtime.publisher.js';
import type { NotificationService } from '../notifications/notification.service.js';
import type { ProjectService } from '../projects/project.service.js';
import type { UserRepositoryContract } from '../users/user.repository.js';
import type {
  AuthenticatedUserDto,
  PaginationMeta,
  ProjectMessageDto,
  ProjectMessageInput,
} from '@nexops/shared';
import type { HydratedDocument } from 'mongoose';

function toDto(
  message: HydratedDocument<ProjectMessage>,
  participants: ReadonlyMap<string, ChatParticipantRecord>,
): ProjectMessageDto {
  const senderId = message.senderId.toString();
  return {
    id: message._id.toString(),
    projectId: message.projectId.toString(),
    sender: participants.get(senderId) ?? {
      id: senderId,
      name: 'Former team member',
      role: 'unknown',
    },
    content: message.content,
    mentions: message.mentions.map(String),
    ...(message.editedAt ? { editedAt: message.editedAt.toISOString() } : {}),
    createdAt: message.createdAt.toISOString(),
  };
}

export class ChatService {
  public constructor(
    private readonly repository: ChatRepository,
    private readonly projects: ProjectService,
    private readonly users: UserRepositoryContract,
    private readonly notifications: NotificationService,
    private readonly realtime: RealtimePublisher,
  ) {}

  public async history(
    user: AuthenticatedUserDto,
    projectId: string,
    page: number,
    limit: number,
  ): Promise<{ items: ProjectMessageDto[]; meta: PaginationMeta }> {
    await this.projects.requireAccessible(user, projectId);
    const result = await this.repository.list(user.organisationId, projectId, page, limit);
    const participants = await this.repository.participants(
      user.organisationId,
      result.items.map((message) => message.senderId.toString()),
    );
    return {
      items: result.items.map((message) => toDto(message, participants)),
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
    input: ProjectMessageInput,
  ): Promise<ProjectMessageDto> {
    await this.projects.requireAccessible(user, input.projectId);
    const mentions = Array.from(new Set(input.mentions)).filter((id) => id !== user.id);
    if (!(await this.users.membersBelongToOrganisation(user.organisationId, mentions))) {
      throw new AppError({
        code: 'CHAT_MENTION_INVALID',
        message: 'Every mentioned user must belong to this organisation',
        statusCode: 422,
      });
    }
    const message = await this.repository.create({
      organisationId: user.organisationId,
      projectId: input.projectId,
      senderId: user.id,
      content: input.content,
      mentions,
    } as unknown as Omit<ProjectMessage, 'createdAt' | 'updatedAt'>);
    const dto = toDto(
      message,
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
    this.realtime.publishProjectMessage(user.organisationId, input.projectId, dto);
    await Promise.all(
      mentions.map((userId) =>
        this.notifications.create({
          organisationId: user.organisationId,
          userId,
          type: 'user_mention',
          title: `${user.name} mentioned you`,
          message: input.content.slice(0, 180),
          entityType: 'project',
          entityId: input.projectId,
        }),
      ),
    );
    return dto;
  }
}
