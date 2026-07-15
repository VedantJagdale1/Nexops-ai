import { AppError } from '../../common/errors/app-error.js';
import { noopRealtimePublisher } from '../../infrastructure/realtime/realtime.publisher.js';

import type { Ticket } from './ticket.model.js';
import type { TicketListOptions, TicketRepository } from './ticket.repository.js';
import type { RealtimePublisher } from '../../infrastructure/realtime/realtime.publisher.js';
import type { ClientRepository } from '../clients/client.repository.js';
import type { NotificationService } from '../notifications/notification.service.js';
import type { ProjectRepository } from '../projects/project.repository.js';
import type { UserRepositoryContract } from '../users/user.repository.js';
import type {
  AuthenticatedUserDto,
  CreateTicketInput,
  PaginationMeta,
  TicketDto,
  TicketMessageDto,
  TicketMessageInput,
  UpdateTicketInput,
} from '@nexops/shared';
import type { HydratedDocument } from 'mongoose';
const slaHours = { low: 120, medium: 72, high: 24, critical: 4 } as const;
function ticketDto(ticket: HydratedDocument<Ticket>): TicketDto {
  return {
    id: ticket._id.toString(),
    clientId: ticket.clientId.toString(),
    ...(ticket.projectId ? { projectId: ticket.projectId.toString() } : {}),
    createdBy: ticket.createdBy.toString(),
    ...(ticket.assignedTo ? { assignedTo: ticket.assignedTo.toString() } : {}),
    subject: ticket.subject,
    description: ticket.description,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    ...(ticket.slaDeadline ? { slaDeadline: ticket.slaDeadline.toISOString() } : {}),
    ...(ticket.resolvedAt ? { resolvedAt: ticket.resolvedAt.toISOString() } : {}),
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
}
export class TicketService {
  public constructor(
    private readonly repository: TicketRepository,
    private readonly clients: ClientRepository,
    private readonly projects: ProjectRepository,
    private readonly users: UserRepositoryContract,
    private readonly notifications: NotificationService,
    private readonly realtime: RealtimePublisher = noopRealtimePublisher,
  ) {}
  public async list(
    user: AuthenticatedUserDto,
    options: TicketListOptions,
  ): Promise<{ items: TicketDto[]; meta: PaginationMeta }> {
    const result = await this.repository.list(user.organisationId, {
      ...options,
      ...(user.role === 'client' && user.clientId ? { clientId: user.clientId } : {}),
    });
    return {
      items: result.items.map(ticketDto),
      meta: {
        page: options.page,
        limit: options.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / options.limit),
      },
    };
  }
  public async get(user: AuthenticatedUserDto, id: string): Promise<TicketDto> {
    return ticketDto(await this.requireAccess(user, id));
  }
  public async create(user: AuthenticatedUserDto, input: CreateTicketInput): Promise<TicketDto> {
    const clientId = user.role === 'client' ? user.clientId : input.clientId;
    if (!clientId)
      throw new AppError({
        code: 'CLIENT_REQUIRED',
        message: 'A client is required',
        statusCode: 422,
      });
    if (!(await this.clients.findById(user.organisationId, clientId)))
      throw new AppError({
        code: 'CLIENT_NOT_FOUND',
        message: 'Client not found',
        statusCode: 404,
      });
    if (input.projectId) {
      const project = await this.projects.findById(user.organisationId, input.projectId);
      if (!project || project.clientId.toString() !== clientId)
        throw new AppError({
          code: 'PROJECT_NOT_FOUND',
          message: 'Project not found for this client',
          statusCode: 404,
        });
    }
    const priority = input.priority ?? 'medium';
    const ticket = await this.repository.create({
      organisationId: user.organisationId,
      clientId,
      ...(input.projectId ? { projectId: input.projectId } : {}),
      createdBy: user.id,
      subject: input.subject,
      description: input.description,
      category: input.category ?? 'other',
      priority,
      status: 'open',
      slaDeadline: new Date(Date.now() + slaHours[priority] * 3_600_000),
    } as unknown as Omit<Ticket, 'createdAt' | 'updatedAt'>);
    const dto = ticketDto(ticket);
    this.realtime.publishTicketUpdated(user.organisationId, clientId, dto);
    return dto;
  }
  public async update(
    user: AuthenticatedUserDto,
    id: string,
    input: UpdateTicketInput,
  ): Promise<TicketDto> {
    const current = await this.requireAccess(user, id);
    if (
      input.assignedTo &&
      !(await this.users.membersBelongToOrganisation(user.organisationId, [input.assignedTo]))
    )
      throw new AppError({
        code: 'TICKET_ASSIGNEE_INVALID',
        message: 'Assignee must belong to this organisation',
        statusCode: 422,
      });
    const data = {
      ...input,
      ...(input.status === 'resolved' || input.status === 'closed'
        ? { resolvedAt: new Date() }
        : input.status
          ? { resolvedAt: undefined }
          : {}),
    } as unknown as Partial<Ticket>;
    const updated = await this.repository.update(user.organisationId, id, data);
    if (!updated) throw this.notFound();
    if (input.assignedTo && input.assignedTo !== current.assignedTo?.toString())
      await this.notifications.create({
        organisationId: user.organisationId,
        userId: input.assignedTo,
        type: 'ticket_assignment',
        title: 'Ticket assigned to you',
        message: updated.subject,
        entityType: 'ticket',
        entityId: updated._id.toString(),
      });
    const dto = ticketDto(updated);
    this.realtime.publishTicketUpdated(user.organisationId, updated.clientId.toString(), dto);
    return dto;
  }
  public async messages(user: AuthenticatedUserDto, id: string): Promise<TicketMessageDto[]> {
    await this.requireAccess(user, id);
    const messages = await this.repository.listMessages(
      user.organisationId,
      id,
      user.role !== 'client',
    );
    return messages.map((message) => ({
      id: message._id.toString(),
      ticketId: message.ticketId.toString(),
      senderId: message.senderId.toString(),
      content: message.content,
      internal: message.internal,
      createdAt: message.createdAt.toISOString(),
    }));
  }
  public async addMessage(
    user: AuthenticatedUserDto,
    id: string,
    input: TicketMessageInput,
  ): Promise<TicketMessageDto> {
    const ticket = await this.requireAccess(user, id);
    const internal = user.role === 'client' ? false : (input.internal ?? false);
    const message = await this.repository.createMessage({
      organisationId: user.organisationId,
      ticketId: id,
      senderId: user.id,
      content: input.content,
      internal,
    } as unknown as Parameters<TicketRepository['createMessage']>[0]);
    if (!internal) {
      const recipient =
        user.id === ticket.createdBy.toString()
          ? ticket.assignedTo?.toString()
          : ticket.createdBy.toString();
      if (recipient)
        await this.notifications.create({
          organisationId: user.organisationId,
          userId: recipient,
          type: 'ticket_reply',
          title: 'New ticket reply',
          message: ticket.subject,
          entityType: 'ticket',
          entityId: id,
        });
    }
    return {
      id: message._id.toString(),
      ticketId: id,
      senderId: user.id,
      content: message.content,
      internal: message.internal,
      createdAt: message.createdAt.toISOString(),
    };
  }
  private async requireAccess(
    user: AuthenticatedUserDto,
    id: string,
  ): Promise<HydratedDocument<Ticket>> {
    const ticket = await this.repository.findById(user.organisationId, id);
    if (!ticket || (user.role === 'client' && user.clientId !== ticket.clientId.toString()))
      throw this.notFound();
    return ticket;
  }
  private notFound() {
    return new AppError({ code: 'TICKET_NOT_FOUND', message: 'Ticket not found', statusCode: 404 });
  }
}
