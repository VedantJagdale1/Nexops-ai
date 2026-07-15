import { Types } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';

import { TicketService } from './ticket.service.js';

import type { Ticket } from './ticket.model.js';
import type { TicketRepository } from './ticket.repository.js';
import type { ClientRepository } from '../clients/client.repository.js';
import type { NotificationService } from '../notifications/notification.service.js';
import type { ProjectRepository } from '../projects/project.repository.js';
import type { UserRepositoryContract } from '../users/user.repository.js';
import type { AuthenticatedUserDto } from '@nexops/shared';
import type { HydratedDocument } from 'mongoose';

const organisationId = new Types.ObjectId();
const linkedClientId = new Types.ObjectId();
const otherClientId = new Types.ObjectId();
const ticketId = new Types.ObjectId();
const clientUser: AuthenticatedUserDto = {
  id: new Types.ObjectId().toString(),
  organisationId: organisationId.toString(),
  clientId: linkedClientId.toString(),
  name: 'Client User',
  email: 'client@nexops.test',
  role: 'client',
  emailVerified: true,
};

function ticket(clientId = linkedClientId): HydratedDocument<Ticket> {
  return {
    _id: ticketId,
    organisationId,
    clientId,
    createdBy: new Types.ObjectId(clientUser.id),
    subject: 'Production access problem',
    description: 'The release dashboard is unavailable.',
    category: 'access',
    priority: 'high',
    status: 'open',
    attachments: [],
    createdAt: new Date('2026-07-15T08:00:00.000Z'),
    updatedAt: new Date('2026-07-15T08:00:00.000Z'),
  } as unknown as HydratedDocument<Ticket>;
}

function service(repository: Partial<TicketRepository>): TicketService {
  return new TicketService(
    repository as TicketRepository,
    {} as ClientRepository,
    {} as ProjectRepository,
    {} as UserRepositoryContract,
    {} as NotificationService,
  );
}

describe('TicketService access control', () => {
  it('forces client lists to their linked client account', async () => {
    const list = vi.fn().mockResolvedValue({ items: [ticket()], total: 1 });
    await service({ list }).list(clientUser, {
      page: 1,
      limit: 20,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    });
    expect(list).toHaveBeenCalledWith(
      clientUser.organisationId,
      expect.objectContaining({ clientId: clientUser.clientId }),
    );
  });

  it('conceals a ticket belonging to another client in the same organisation', async () => {
    const findById = vi.fn().mockResolvedValue(ticket(otherClientId));
    await expect(service({ findById }).get(clientUser, ticketId.toString())).rejects.toMatchObject({
      code: 'TICKET_NOT_FOUND',
      statusCode: 404,
    });
  });

  it('excludes internal notes from client message history', async () => {
    const listMessages = vi.fn().mockResolvedValue([]);
    await service({ findById: vi.fn().mockResolvedValue(ticket()), listMessages }).messages(
      clientUser,
      ticketId.toString(),
    );
    expect(listMessages).toHaveBeenCalledWith(
      clientUser.organisationId,
      ticketId.toString(),
      false,
    );
  });
});
