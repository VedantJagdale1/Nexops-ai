import { Types } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';

import { ProjectService } from './project.service.js';

import type { Project } from './project.model.js';
import type { ProjectRepository } from './project.repository.js';
import type { ClientRepository } from '../clients/client.repository.js';
import type { UserRepositoryContract } from '../users/user.repository.js';
import type { AuthenticatedUserDto } from '@nexops/shared';
import type { HydratedDocument } from 'mongoose';

const organisationId = new Types.ObjectId();
const clientId = new Types.ObjectId();
const managerId = new Types.ObjectId();
const manager: AuthenticatedUserDto = {
  id: managerId.toString(),
  organisationId: organisationId.toString(),
  name: 'Morgan Manager',
  email: 'manager@nexops.test',
  role: 'project_manager',
  emailVerified: true,
};
function projectDocument(): HydratedDocument<Project> {
  return {
    _id: new Types.ObjectId(),
    organisationId,
    clientId,
    name: 'Portal Modernisation',
    key: 'PORTAL',
    status: 'active',
    priority: 'high',
    projectManagerId: managerId,
    memberIds: [managerId],
    actualCostMinor: 0,
    progress: 0,
    tags: [],
    milestones: [],
    createdBy: managerId,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as HydratedDocument<Project>;
}

describe('ProjectService', () => {
  it('creates an assigned project manager project with a unique organisation key', async () => {
    const projects = {
      create: vi.fn().mockResolvedValue(projectDocument()),
      keyExists: vi.fn().mockResolvedValue(false),
    } as unknown as ProjectRepository;
    const clients = {
      findById: vi.fn().mockResolvedValue({ _id: clientId }),
    } as unknown as ClientRepository;
    const users = {
      membersBelongToOrganisation: vi.fn().mockResolvedValue(true),
    } as unknown as UserRepositoryContract;
    const service = new ProjectService(projects, clients, users);
    const keyExists = vi.spyOn(projects, 'keyExists');
    const create = vi.spyOn(projects, 'create');
    await service.create(manager, {
      clientId: clientId.toString(),
      name: 'Portal Modernisation',
      key: 'portal',
      status: 'active',
      priority: 'high',
      memberIds: [],
      tags: [],
    });
    expect(keyExists).toHaveBeenCalledWith(manager.organisationId, 'PORTAL');
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        organisationId: manager.organisationId,
        projectManagerId: manager.id,
        memberIds: [manager.id],
      }),
    );
  });
});
