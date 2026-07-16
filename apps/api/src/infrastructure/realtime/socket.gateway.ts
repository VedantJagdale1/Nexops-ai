import {
  projectMessageInputSchema,
  projectRoomInputSchema,
  projectTypingInputSchema,
  roleHasPermission,
  taskTypingInputSchema,
} from '@nexops/shared';
import { Server } from 'socket.io';

import { AppError } from '../../common/errors/app-error.js';
import { toAuthenticatedUser } from '../../modules/auth/auth.types.js';

import { roomNames } from './rooms.js';

import type { AppLogger } from '../../config/logger.js';
import type { TokenService } from '../../modules/auth/token.service.js';
import type { ChatService } from '../../modules/chat/chat.service.js';
import type { UserRepositoryContract } from '../../modules/users/user.repository.js';
import type {
  AuthenticatedUserDto,
  ChatParticipantDto,
  ClientToServerEvents,
  ProjectPresenceDto,
  ServerToClientEvents,
  SocketAck,
} from '@nexops/shared';
import type { Server as HttpServer } from 'node:http';
import type { Socket } from 'socket.io';

interface InterServerEvents {
  ping: () => void;
}

interface RealtimeSocketData {
  user: AuthenticatedUserDto;
  participant: ChatParticipantDto;
  joinedProjects: Set<string>;
  recentMessages: number[];
}

interface ProjectAccessService {
  requireAccessible(user: AuthenticatedUserDto, projectId: string): Promise<unknown>;
}

interface SocketIdentityDependencies {
  tokenService: TokenService;
  userRepository: UserRepositoryContract;
}

interface PresenceEntry {
  participant: ChatParticipantDto;
  connections: number;
}

export type RealtimeServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  RealtimeSocketData
>;
type RealtimeSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  RealtimeSocketData
>;

export function createRealtimeServer(httpServer: HttpServer, clientUrl: string): RealtimeServer {
  return new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    RealtimeSocketData
  >(httpServer, {
    cors: { origin: clientUrl, credentials: true },
    serveClient: false,
  });
}

function participant(user: AuthenticatedUserDto): ChatParticipantDto {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    ...(user.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
  };
}

function socketToken(socket: RealtimeSocket): string | undefined {
  const handshakeAuth = socket.handshake.auth as Record<string, unknown>;
  const authToken = handshakeAuth['token'];
  if (typeof authToken === 'string' && authToken.length > 0) return authToken;
  const [scheme, headerToken] = socket.handshake.headers.authorization?.split(' ') ?? [];
  return scheme?.toLowerCase() === 'bearer' ? headerToken : undefined;
}

function failure<T>(code: string, message: string): SocketAck<T> {
  return { success: false, error: { code, message } };
}

function appFailure<T>(
  error: unknown,
  fallbackCode: string,
  fallbackMessage: string,
): SocketAck<T> {
  if (error instanceof AppError && error.statusCode < 500) {
    return failure(error.code, error.message);
  }
  return failure(fallbackCode, fallbackMessage);
}

export function configureSocketGateway(
  server: RealtimeServer,
  identity: SocketIdentityDependencies,
  projects: ProjectAccessService,
  chat: ChatService,
  logger: AppLogger,
): void {
  const presence = new Map<string, Map<string, PresenceEntry>>();

  server.use((socket, next) => {
    void (async () => {
      const token = socketToken(socket);
      if (!token) throw new Error('Access token is required');
      const claims = identity.tokenService.verifyAccessToken(token);
      const userDocument = await identity.userRepository.findById(claims.userId);
      if (
        !userDocument ||
        userDocument.status !== 'active' ||
        userDocument.organisationId.toString() !== claims.organisationId
      ) {
        throw new Error('User is not active');
      }
      const user = toAuthenticatedUser(userDocument);
      socket.data.user = user;
      socket.data.participant = participant(user);
      socket.data.joinedProjects = new Set();
      socket.data.recentMessages = [];
      next();
    })().catch((error: unknown) => {
      logger.warn({ err: error, socketId: socket.id }, 'Socket authentication rejected');
      next(new Error('Authentication required'));
    });
  });

  const currentPresence = (organisationId: string, projectId: string): ProjectPresenceDto => ({
    projectId,
    users: Array.from(presence.get(roomNames.project(organisationId, projectId))?.values() ?? [])
      .map((entry) => entry.participant)
      .sort((left, right) => left.name.localeCompare(right.name)),
  });

  const broadcastPresence = (organisationId: string, projectId: string): void => {
    server
      .to(roomNames.project(organisationId, projectId))
      .emit('presence:update', currentPresence(organisationId, projectId));
  };

  const addPresence = (socket: RealtimeSocket, projectId: string): void => {
    const room = roomNames.project(socket.data.user.organisationId, projectId);
    const users = presence.get(room) ?? new Map<string, PresenceEntry>();
    const existing = users.get(socket.data.user.id);
    users.set(socket.data.user.id, {
      participant: socket.data.participant,
      connections: (existing?.connections ?? 0) + 1,
    });
    presence.set(room, users);
  };

  const removePresence = (socket: RealtimeSocket, projectId: string): void => {
    const room = roomNames.project(socket.data.user.organisationId, projectId);
    const users = presence.get(room);
    const existing = users?.get(socket.data.user.id);
    if (!users || !existing) return;
    if (existing.connections > 1)
      users.set(socket.data.user.id, { ...existing, connections: existing.connections - 1 });
    else users.delete(socket.data.user.id);
    if (users.size === 0) presence.delete(room);
  };

  server.on('connection', (socket) => {
    const user = socket.data.user;
    void socket.join([
      roomNames.organisation(user.organisationId),
      roomNames.user(user.organisationId, user.id),
      ...(user.role === 'client' && user.clientId
        ? [roomNames.client(user.organisationId, user.clientId)]
        : [roomNames.staff(user.organisationId)]),
    ]);

    socket.on('project:join', (rawInput, acknowledge) => {
      void (async () => {
        const input = projectRoomInputSchema.safeParse(rawInput);
        if (!input.success) {
          acknowledge(failure('SOCKET_INPUT_INVALID', 'A valid project is required'));
          return;
        }
        if (!roleHasPermission(user.role, 'project:read')) {
          acknowledge(failure('PROJECT_ACCESS_DENIED', 'Project access is denied'));
          return;
        }
        try {
          await projects.requireAccessible(user, input.data.projectId);
          if (!socket.data.joinedProjects.has(input.data.projectId)) {
            await socket.join(roomNames.project(user.organisationId, input.data.projectId));
            socket.data.joinedProjects.add(input.data.projectId);
            addPresence(socket, input.data.projectId);
            broadcastPresence(user.organisationId, input.data.projectId);
          }
          acknowledge({
            success: true,
            data: currentPresence(user.organisationId, input.data.projectId),
          });
        } catch (error) {
          acknowledge(appFailure(error, 'PROJECT_ACCESS_DENIED', 'Project access is denied'));
        }
      })();
    });

    socket.on('project:leave', (rawInput, acknowledge) => {
      void (async () => {
        const input = projectRoomInputSchema.safeParse(rawInput);
        if (!input.success) {
          acknowledge(failure('SOCKET_INPUT_INVALID', 'A valid project is required'));
          return;
        }
        if (socket.data.joinedProjects.delete(input.data.projectId)) {
          removePresence(socket, input.data.projectId);
          await socket.leave(roomNames.project(user.organisationId, input.data.projectId));
          broadcastPresence(user.organisationId, input.data.projectId);
        }
        acknowledge({ success: true, data: null });
      })();
    });

    socket.on('typing:update', (rawInput) => {
      const input = projectTypingInputSchema.safeParse(rawInput);
      if (!input.success || !socket.data.joinedProjects.has(input.data.projectId)) return;
      socket
        .to(roomNames.project(user.organisationId, input.data.projectId))
        .emit('typing:update', {
          projectId: input.data.projectId,
          user: socket.data.participant,
          isTyping: input.data.isTyping,
        });
    });

    socket.on('task:typing', (rawInput) => {
      const input = taskTypingInputSchema.safeParse(rawInput);
      if (
        !input.success ||
        !roleHasPermission(user.role, 'task:comment') ||
        !socket.data.joinedProjects.has(input.data.projectId)
      )
        return;
      socket.to(roomNames.project(user.organisationId, input.data.projectId)).emit('task:typing', {
        projectId: input.data.projectId,
        taskId: input.data.taskId,
        user: socket.data.participant,
        isTyping: input.data.isTyping,
      });
    });

    socket.on('chat:send', (rawInput, acknowledge) => {
      void (async () => {
        const input = projectMessageInputSchema.safeParse(rawInput);
        if (!input.success) {
          acknowledge(failure('SOCKET_INPUT_INVALID', 'The message is invalid'));
          return;
        }
        if (
          !roleHasPermission(user.role, 'chat:write') ||
          !socket.data.joinedProjects.has(input.data.projectId)
        ) {
          acknowledge(failure('CHAT_ACCESS_DENIED', 'Join the authorised project room first'));
          return;
        }
        const now = Date.now();
        socket.data.recentMessages = socket.data.recentMessages.filter(
          (timestamp) => now - timestamp < 10_000,
        );
        if (socket.data.recentMessages.length >= 20) {
          acknowledge(failure('CHAT_RATE_LIMITED', 'Please wait before sending more messages'));
          return;
        }
        socket.data.recentMessages.push(now);
        try {
          acknowledge({ success: true, data: await chat.create(user, input.data) });
        } catch (error) {
          acknowledge(appFailure(error, 'CHAT_MESSAGE_FAILED', 'The message could not be sent'));
        }
      })();
    });

    socket.on('disconnect', () => {
      for (const projectId of socket.data.joinedProjects) {
        removePresence(socket, projectId);
        broadcastPresence(user.organisationId, projectId);
      }
      socket.data.joinedProjects.clear();
    });
  });
}
