import { createServer } from 'node:http';

import { Types } from 'mongoose';
import { io as createClient } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppError } from '../../common/errors/app-error.js';
import { createLogger } from '../../config/logger.js';
import { TokenService } from '../../modules/auth/token.service.js';
import { testEnvironment } from '../../test/environment.js';

import { roomNames } from './rooms.js';
import { configureSocketGateway, createRealtimeServer } from './socket.gateway.js';
import { SocketRealtimePublisher } from './socket.publisher.js';

import type { ChatService } from '../../modules/chat/chat.service.js';
import type { User } from '../../modules/users/user.model.js';
import type { UserRepositoryContract } from '../../modules/users/user.repository.js';
import type {
  AuthenticatedUserDto,
  ClientToServerEvents,
  ServerToClientEvents,
  TaskCommentDto,
  TaskDto,
  TaskTypingDto,
} from '@nexops/shared';
import type { HydratedDocument } from 'mongoose';
import type { Socket as ClientSocket } from 'socket.io-client';
import type { Mock } from 'vitest';

const organisationId = new Types.ObjectId();
const userId = new Types.ObjectId();
const allowedProjectId = new Types.ObjectId().toString();
const forbiddenProjectId = new Types.ObjectId().toString();

function userDocument(): HydratedDocument<User> {
  return {
    _id: userId,
    organisationId,
    name: 'Realtime Developer',
    email: 'realtime@nexops.test',
    passwordHash: 'not-selected',
    role: 'developer',
    status: 'active',
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as HydratedDocument<User>;
}

describe('Socket gateway authorisation', () => {
  const clients: Array<ClientSocket<ServerToClientEvents, ClientToServerEvents>> = [];
  let url: string;
  let httpServer: ReturnType<typeof createServer>;
  let socketServer: ReturnType<typeof createRealtimeServer>;
  let tokens: TokenService;
  let requireAccessible: Mock<(user: AuthenticatedUserDto, projectId: string) => Promise<unknown>>;
  let projectAccess: {
    requireAccessible: (user: AuthenticatedUserDto, projectId: string) => Promise<unknown>;
  };

  beforeEach(async () => {
    tokens = new TokenService(testEnvironment);
    requireAccessible = vi.fn(
      async (_user: AuthenticatedUserDto, projectId: string): Promise<unknown> => {
        if (projectId !== allowedProjectId) {
          throw new AppError({
            code: 'PROJECT_NOT_FOUND',
            message: 'Project not found',
            statusCode: 404,
          });
        }
        return {};
      },
    );
    projectAccess = { requireAccessible };
    const users = {
      findById: vi.fn().mockResolvedValue(userDocument()),
    } as unknown as UserRepositoryContract;
    const chat = { create: vi.fn() } as unknown as ChatService;
    httpServer = createServer();
    socketServer = createRealtimeServer(httpServer, testEnvironment.CLIENT_URL);
    configureSocketGateway(
      socketServer,
      { tokenService: tokens, userRepository: users },
      projectAccess,
      chat,
      createLogger(testEnvironment),
    );
    await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
    const address = httpServer.address();
    if (!address || typeof address === 'string') throw new Error('Test server address unavailable');
    url = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    clients.forEach((client) => client.disconnect());
    clients.length = 0;
    await new Promise<void>((resolve) => {
      void socketServer.close(() => resolve());
    });
  });

  function accessToken(): string {
    return tokens.signAccessToken({
      userId: userId.toString(),
      organisationId: organisationId.toString(),
      role: 'developer',
    });
  }

  async function connect(
    token: string,
  ): Promise<ClientSocket<ServerToClientEvents, ClientToServerEvents>> {
    const client: ClientSocket<ServerToClientEvents, ClientToServerEvents> = createClient(url, {
      auth: { token },
      forceNew: true,
      transports: ['websocket'],
    });
    clients.push(client);
    await new Promise<void>((resolve, reject) => {
      client.once('connect', resolve);
      client.once('connect_error', reject);
    });
    return client;
  }

  async function joinProject(
    client: ClientSocket<ServerToClientEvents, ClientToServerEvents>,
  ): Promise<void> {
    const response = await new Promise<
      Parameters<Parameters<ClientToServerEvents['project:join']>[1]>[0]
    >((resolve) => {
      client.emit('project:join', { projectId: allowedProjectId }, resolve);
    });
    expect(response).toMatchObject({ success: true });
  }

  it('rejects socket connections without a valid access token', async () => {
    const client = createClient(url, {
      auth: { token: 'invalid' },
      forceNew: true,
      transports: ['websocket'],
      reconnection: false,
    });
    clients.push(client);
    const message = await new Promise<string>((resolve) => {
      client.once('connect_error', (error) => resolve(error.message));
    });
    expect(message).toBe('Authentication required');
  });

  it('joins only a project that the authenticated user can access', async () => {
    const client = await connect(accessToken());
    const response = await new Promise<
      Parameters<Parameters<ClientToServerEvents['project:join']>[1]>[0]
    >((resolve) => {
      client.emit('project:join', { projectId: allowedProjectId }, resolve);
    });
    expect(response).toMatchObject({ success: true, data: { projectId: allowedProjectId } });
    expect(requireAccessible).toHaveBeenCalledWith(
      expect.objectContaining({ organisationId: organisationId.toString() }),
      allowedProjectId,
    );
  });

  it('does not subscribe a user to an unauthorised project room', async () => {
    const client = await connect(accessToken());
    const response = await new Promise<
      Parameters<Parameters<ClientToServerEvents['project:join']>[1]>[0]
    >((resolve) => {
      client.emit('project:join', { projectId: forbiddenProjectId }, resolve);
    });
    const sockets = await socketServer
      .in(roomNames.project(organisationId.toString(), forbiddenProjectId))
      .fetchSockets();
    expect(response).toMatchObject({ success: false, error: { code: 'PROJECT_NOT_FOUND' } });
    expect(sockets).toHaveLength(0);
  });

  it('broadcasts project presence and task typing only inside an authorised room', async () => {
    const first = await connect(accessToken());
    await joinProject(first);
    const presenceUpdate = new Promise<number>((resolve) => {
      first.once('presence:update', (presence) => resolve(presence.users.length));
    });
    const second = await connect(accessToken());
    await joinProject(second);
    expect(await presenceUpdate).toBe(1);

    const typingUpdate = new Promise<TaskTypingDto>((resolve) => {
      first.once('task:typing', resolve);
    });
    const typingTaskId = new Types.ObjectId().toString();
    second.emit('task:typing', {
      projectId: allowedProjectId,
      taskId: typingTaskId,
      isTyping: true,
    });
    await expect(typingUpdate).resolves.toMatchObject({
      projectId: allowedProjectId,
      taskId: typingTaskId,
      isTyping: true,
      user: { id: userId.toString() },
    });
  });

  it('delivers task moves and persisted comments to project viewers', async () => {
    const client = await connect(accessToken());
    await joinProject(client);
    const publisher = new SocketRealtimePublisher(socketServer);
    const task = {
      id: new Types.ObjectId().toString(),
      projectId: allowedProjectId,
      title: 'Move the integration card',
      status: 'in_progress',
      priority: 'high',
      assigneeIds: [userId.toString()],
      reporterId: userId.toString(),
      loggedMinutes: 0,
      labels: [],
      checklist: [],
      position: 0,
      createdAt: '2026-07-16T07:00:00.000Z',
      updatedAt: '2026-07-16T07:05:00.000Z',
    } satisfies TaskDto;
    const comment = {
      id: new Types.ObjectId().toString(),
      taskId: task.id,
      projectId: allowedProjectId,
      author: { id: userId.toString(), name: 'Realtime Developer', role: 'developer' },
      content: 'This comment was persisted before broadcast.',
      createdAt: '2026-07-16T07:06:00.000Z',
    } satisfies TaskCommentDto;
    const taskUpdate = new Promise<TaskDto>((resolve) => client.once('task:updated', resolve));
    const commentUpdate = new Promise<TaskCommentDto>((resolve) =>
      client.once('task:commented', resolve),
    );

    publisher.publishTaskUpdated(organisationId.toString(), allowedProjectId, task);
    publisher.publishTaskCommented(organisationId.toString(), allowedProjectId, comment);

    await expect(taskUpdate).resolves.toEqual(task);
    await expect(commentUpdate).resolves.toEqual(comment);
  });
});
