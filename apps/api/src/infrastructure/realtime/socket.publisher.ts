import { roomNames } from './rooms.js';

import type { RealtimePublisher } from './realtime.publisher.js';
import type { RealtimeServer } from './socket.gateway.js';
import type { NotificationDto, ProjectMessageDto, TaskDto, TicketDto } from '@nexops/shared';

export class SocketRealtimePublisher implements RealtimePublisher {
  public constructor(private readonly server: RealtimeServer) {}

  public publishProjectMessage(
    organisationId: string,
    projectId: string,
    message: ProjectMessageDto,
  ): void {
    this.server.to(roomNames.project(organisationId, projectId)).emit('chat:message', message);
  }

  public publishTaskUpdated(organisationId: string, projectId: string, task: TaskDto): void {
    this.server.to(roomNames.project(organisationId, projectId)).emit('task:updated', task);
  }

  public publishTicketUpdated(organisationId: string, clientId: string, ticket: TicketDto): void {
    this.server
      .to(roomNames.staff(organisationId))
      .to(roomNames.client(organisationId, clientId))
      .emit('ticket:updated', ticket);
  }

  public publishNotification(
    organisationId: string,
    userId: string,
    notification: NotificationDto,
  ): void {
    this.server.to(roomNames.user(organisationId, userId)).emit('notification:new', notification);
  }
}
