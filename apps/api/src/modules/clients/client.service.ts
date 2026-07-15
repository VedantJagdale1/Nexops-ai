import { AppError } from '../../common/errors/app-error.js';
import { canAccessClient } from '../../common/policies/entity-access.js';

import type { Client as ClientDocument } from './client.model.js';
import type { ClientListOptions, ClientRepository } from './client.repository.js';
import type { ClientDto, ClientInput, PaginationMeta, UpdateClientInput } from '@nexops/shared';
import type { AuthenticatedUserDto } from '@nexops/shared';
import type { HydratedDocument } from 'mongoose';

function optional<T>(value: T | null | undefined): T | undefined {
  return value ?? undefined;
}

export function toClientDto(client: HydratedDocument<ClientDocument>): ClientDto {
  return {
    id: client._id.toString(),
    companyName: client.companyName,
    contactName: client.contactName,
    contactEmail: client.contactEmail,
    ...(optional(client.contactPhone) ? { contactPhone: client.contactPhone } : {}),
    ...(optional(client.industry) ? { industry: client.industry } : {}),
    ...(optional(client.address) ? { address: client.address } : {}),
    status: client.status,
    ...(optional(client.notes) ? { notes: client.notes } : {}),
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
  };
}

export class ClientService {
  public constructor(private readonly repository: ClientRepository) {}

  public async list(
    user: AuthenticatedUserDto,
    options: ClientListOptions,
  ): Promise<{ items: ClientDto[]; meta: PaginationMeta }> {
    const page = await this.repository.list(user.organisationId, {
      ...options,
      ...(user.role === 'client' && user.clientId ? { clientId: user.clientId } : {}),
    });
    return {
      items: page.items.map(toClientDto),
      meta: {
        page: options.page,
        limit: options.limit,
        total: page.total,
        totalPages: Math.ceil(page.total / options.limit),
      },
    };
  }

  public async get(user: AuthenticatedUserDto, id: string): Promise<ClientDto> {
    const client = await this.requireAccessible(user, id);
    return toClientDto(client);
  }

  public async create(user: AuthenticatedUserDto, input: ClientInput): Promise<ClientDto> {
    const client = await this.repository.create({
      ...input,
      status: input.status ?? 'active',
      organisationId: user.organisationId,
      createdBy: user.id,
    } as unknown as Omit<ClientDocument, 'createdAt' | 'updatedAt'>);
    return toClientDto(client);
  }

  public async update(
    user: AuthenticatedUserDto,
    id: string,
    input: UpdateClientInput,
  ): Promise<ClientDto> {
    await this.requireAccessible(user, id);
    const client = await this.repository.update(
      user.organisationId,
      id,
      input as Partial<ClientDocument>,
    );
    if (!client) throw this.notFound();
    return toClientDto(client);
  }

  public async delete(user: AuthenticatedUserDto, id: string): Promise<void> {
    await this.requireAccessible(user, id);
    if (!(await this.repository.delete(user.organisationId, id))) throw this.notFound();
  }

  private async requireAccessible(
    user: AuthenticatedUserDto,
    id: string,
  ): Promise<HydratedDocument<ClientDocument>> {
    const client = await this.repository.findById(user.organisationId, id);
    if (
      !client ||
      !canAccessClient(user, {
        id: client._id.toString(),
        organisationId: client.organisationId.toString(),
      })
    ) {
      throw this.notFound();
    }
    return client;
  }

  private notFound(): AppError {
    return new AppError({ code: 'CLIENT_NOT_FOUND', message: 'Client not found', statusCode: 404 });
  }
}
