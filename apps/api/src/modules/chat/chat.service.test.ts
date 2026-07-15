import { Types } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';

import { ChatService } from './chat.service.js';

import type { ChatRepository } from './chat.repository.js';
import type { ProjectMessage } from './project-message.model.js';
import type { RealtimePublisher } from '../../infrastructure/realtime/realtime.publisher.js';
import type { NotificationService } from '../notifications/notification.service.js';
import type { ProjectService } from '../projects/project.service.js';
import type { UserRepositoryContract } from '../users/user.repository.js';
import type { AuthenticatedUserDto } from '@nexops/shared';
import type { HydratedDocument } from 'mongoose';

const organisationId = new Types.ObjectId();
const projectId = new Types.ObjectId();
const senderId = new Types.ObjectId();
const mentionedUserId = new Types.ObjectId();
const messageId = new Types.ObjectId();
const sender: AuthenticatedUserDto = {
  id: senderId.toString(),
  organisationId: organisationId.toString(),
  name: 'Priya Manager',
  email: 'priya@nexops.test',
  role: 'project_manager',
  emailVerified: true,
};

function messageDocument(): HydratedDocument<ProjectMessage> {
  return {
    _id: messageId,
    organisationId,
    projectId,
    senderId,
    content: 'The client review is ready.',
    mentions: [mentionedUserId],
    createdAt: new Date('2026-07-16T08:00:00.000Z'),
    updatedAt: new Date('2026-07-16T08:00:00.000Z'),
  } as unknown as HydratedDocument<ProjectMessage>;
}

function realtime(): RealtimePublisher {
  return {
    publishProjectMessage: vi.fn(),
    publishTaskUpdated: vi.fn(),
    publishTicketUpdated: vi.fn(),
    publishNotification: vi.fn(),
  };
}

describe('ChatService', () => {
  it('loads tenant-scoped history only after project access is verified', async () => {
    const list = vi.fn().mockResolvedValue({ items: [messageDocument()], total: 1 });
    const participants = vi
      .fn()
      .mockResolvedValue(
        new Map([[sender.id, { id: sender.id, name: sender.name, role: sender.role }]]),
      );
    const repository = {
      list,
      participants,
    } as unknown as ChatRepository;
    const requireAccessible = vi.fn().mockResolvedValue({});
    const projects = {
      requireAccessible,
    } as unknown as ProjectService;
    const service = new ChatService(
      repository,
      projects,
      {} as UserRepositoryContract,
      {} as NotificationService,
      realtime(),
    );

    const result = await service.history(sender, projectId.toString(), 1, 50);

    expect(requireAccessible).toHaveBeenCalledWith(sender, projectId.toString());
    expect(list).toHaveBeenCalledWith(sender.organisationId, projectId.toString(), 1, 50);
    expect(result.items[0]).toMatchObject({ sender: { name: sender.name } });
  });

  it('derives tenant identity, publishes the stored message, and notifies mentions', async () => {
    const createMessage = vi.fn().mockResolvedValue(messageDocument());
    const repository = {
      create: createMessage,
    } as unknown as ChatRepository;
    const projects = {
      requireAccessible: vi.fn().mockResolvedValue({}),
    } as unknown as ProjectService;
    const users = {
      membersBelongToOrganisation: vi.fn().mockResolvedValue(true),
    } as unknown as UserRepositoryContract;
    const createNotification = vi.fn().mockResolvedValue(undefined);
    const notifications = {
      create: createNotification,
    } as unknown as NotificationService;
    const publishProjectMessage = vi.fn();
    const events = { ...realtime(), publishProjectMessage };
    const service = new ChatService(repository, projects, users, notifications, events);

    const result = await service.create(sender, {
      projectId: projectId.toString(),
      content: 'The client review is ready.',
      mentions: [mentionedUserId.toString()],
    });

    expect(createMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        organisationId: sender.organisationId,
        projectId: projectId.toString(),
        senderId: sender.id,
      }),
    );
    expect(publishProjectMessage).toHaveBeenCalledWith(
      sender.organisationId,
      projectId.toString(),
      result,
    );
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: mentionedUserId.toString(),
        type: 'user_mention',
      }),
    );
  });
});
