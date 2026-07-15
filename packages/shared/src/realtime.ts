import { z } from 'zod';

import { objectIdSchema, paginationQuerySchema } from './schemas.js';

import type { TaskDto } from './delivery.js';
import type { NotificationDto, TicketDto } from './operations.js';

export const projectMessageInputSchema = z.object({
  projectId: objectIdSchema,
  content: z.string().trim().min(1).max(20_000),
  mentions: z.array(objectIdSchema).max(20).default([]),
});

export const projectRoomInputSchema = z.object({ projectId: objectIdSchema });
export const projectTypingInputSchema = z.object({
  projectId: objectIdSchema,
  isTyping: z.boolean(),
});
export const chatHistoryQuerySchema = paginationQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ProjectMessageInput = z.infer<typeof projectMessageInputSchema>;
export type ProjectRoomInput = z.infer<typeof projectRoomInputSchema>;
export type ProjectTypingInput = z.infer<typeof projectTypingInputSchema>;

export interface ChatParticipantDto {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
}

export interface ProjectMessageDto {
  id: string;
  projectId: string;
  sender: ChatParticipantDto;
  content: string;
  mentions: string[];
  editedAt?: string;
  createdAt: string;
}

export interface ProjectPresenceDto {
  projectId: string;
  users: ChatParticipantDto[];
}

export interface ProjectTypingDto {
  projectId: string;
  user: ChatParticipantDto;
  isTyping: boolean;
}

export type SocketAck<T> =
  { success: true; data: T } | { success: false; error: { code: string; message: string } };

export interface ClientToServerEvents {
  'project:join': (
    input: ProjectRoomInput,
    acknowledge: (response: SocketAck<ProjectPresenceDto>) => void,
  ) => void;
  'project:leave': (
    input: ProjectRoomInput,
    acknowledge: (response: SocketAck<null>) => void,
  ) => void;
  'chat:send': (
    input: ProjectMessageInput,
    acknowledge: (response: SocketAck<ProjectMessageDto>) => void,
  ) => void;
  'typing:update': (input: ProjectTypingInput) => void;
}

export interface ServerToClientEvents {
  'chat:message': (message: ProjectMessageDto) => void;
  'presence:update': (presence: ProjectPresenceDto) => void;
  'typing:update': (typing: ProjectTypingDto) => void;
  'task:updated': (task: TaskDto) => void;
  'ticket:updated': (ticket: TicketDto) => void;
  'notification:new': (notification: NotificationDto) => void;
}
