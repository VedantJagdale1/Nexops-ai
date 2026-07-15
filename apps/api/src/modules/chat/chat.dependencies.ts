import { ClientRepository } from '../clients/client.repository.js';
import { NotificationRepository } from '../notifications/notification.repository.js';
import { NotificationService } from '../notifications/notification.service.js';
import { ProjectRepository } from '../projects/project.repository.js';
import { ProjectService } from '../projects/project.service.js';

import { ChatRepository } from './chat.repository.js';
import { ChatService } from './chat.service.js';

import type { RealtimePublisher } from '../../infrastructure/realtime/realtime.publisher.js';
import type { IdentityDependencies } from '../auth/identity.dependencies.js';

export function createChatDependencies(
  identity: IdentityDependencies,
  realtime: RealtimePublisher,
): { chat: ChatService; projects: ProjectService } {
  const clients = new ClientRepository();
  const projects = new ProjectService(new ProjectRepository(), clients, identity.userRepository);
  const notifications = new NotificationService(new NotificationRepository(), realtime);
  return {
    projects,
    chat: new ChatService(
      new ChatRepository(),
      projects,
      identity.userRepository,
      notifications,
      realtime,
    ),
  };
}
