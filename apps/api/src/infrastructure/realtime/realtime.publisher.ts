import type {
  NotificationDto,
  ProjectMessageDto,
  TaskCommentDto,
  TaskDto,
  TicketDto,
} from '@nexops/shared';

export interface RealtimePublisher {
  publishProjectMessage(
    organisationId: string,
    projectId: string,
    message: ProjectMessageDto,
  ): void;
  publishTaskUpdated(organisationId: string, projectId: string, task: TaskDto): void;
  publishTaskCommented(organisationId: string, projectId: string, comment: TaskCommentDto): void;
  publishTicketUpdated(organisationId: string, clientId: string, ticket: TicketDto): void;
  publishNotification(organisationId: string, userId: string, notification: NotificationDto): void;
}

export const noopRealtimePublisher: RealtimePublisher = {
  publishProjectMessage: () => undefined,
  publishTaskUpdated: () => undefined,
  publishTaskCommented: () => undefined,
  publishTicketUpdated: () => undefined,
  publishNotification: () => undefined,
};
