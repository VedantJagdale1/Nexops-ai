import { Types } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';

import { ClientService } from './client.service.js';

import type { Client } from './client.model.js';
import type { ClientRepository } from './client.repository.js';
import type { AuthenticatedUserDto } from '@nexops/shared';
import type { HydratedDocument } from 'mongoose';

const organisationId = new Types.ObjectId();
const clientId = new Types.ObjectId();
const owner: AuthenticatedUserDto = {
  id: new Types.ObjectId().toString(),
  organisationId: organisationId.toString(),
  name: 'Olivia Owner',
  email: 'owner@nexops.test',
  role: 'owner',
  emailVerified: true,
};

function clientDocument(): HydratedDocument<Client> {
  return {
    _id: clientId,
    organisationId,
    companyName: 'Acme Digital',
    contactName: 'Aria Patel',
    contactEmail: 'aria@acme.test',
    status: 'active',
    createdBy: new Types.ObjectId(owner.id),
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-02T00:00:00.000Z'),
  } as unknown as HydratedDocument<Client>;
}

function repository(overrides: Partial<ClientRepository> = {}): ClientRepository {
  return {
    create: vi.fn().mockResolvedValue(clientDocument()),
    list: vi.fn().mockResolvedValue({ items: [clientDocument()], total: 1 }),
    findById: vi.fn().mockResolvedValue(clientDocument()),
    update: vi.fn().mockResolvedValue(clientDocument()),
    delete: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe('ClientService', () => {
  it('derives organisation and creator fields when creating a client', async () => {
    const clients = repository();
    const create = vi.spyOn(clients, 'create');
    const service = new ClientService(clients);
    await service.create(owner, {
      companyName: 'Acme Digital',
      contactName: 'Aria Patel',
      contactEmail: 'aria@acme.test',
      status: 'active',
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ organisationId: owner.organisationId, createdBy: owner.id }),
    );
  });

  it('limits a client user list to their linked client account', async () => {
    const clients = repository();
    const list = vi.spyOn(clients, 'list');
    const service = new ClientService(clients);
    await service.list(
      { ...owner, role: 'client', clientId: clientId.toString() },
      { page: 1, limit: 20, sortBy: 'companyName', sortOrder: 'asc' },
    );
    expect(list).toHaveBeenCalledWith(
      owner.organisationId,
      expect.objectContaining({ clientId: clientId.toString() }),
    );
  });

  it('executes tenant-scoped update and delete operations', async () => {
    const clients = repository();
    const update = vi.spyOn(clients, 'update');
    const remove = vi.spyOn(clients, 'delete');
    const service = new ClientService(clients);
    await service.update(owner, clientId.toString(), { status: 'inactive' });
    await service.delete(owner, clientId.toString());
    expect(update).toHaveBeenCalledWith(owner.organisationId, clientId.toString(), {
      status: 'inactive',
    });
    expect(remove).toHaveBeenCalledWith(owner.organisationId, clientId.toString());
  });
});
