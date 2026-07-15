import type { AuthenticatedUserDto } from '@nexops/shared';

interface TenantResource {
  organisationId: string;
}

interface ClientResource extends TenantResource {
  clientId: string;
}

interface ProjectResource extends ClientResource {
  projectManagerId?: string;
  memberIds: readonly string[];
}

export function canAccessClient(
  user: AuthenticatedUserDto,
  client: TenantResource & { id: string },
): boolean {
  if (user.organisationId !== client.organisationId) return false;
  if (user.role !== 'client') return true;
  return user.clientId === client.id;
}

export function canAccessProject(user: AuthenticatedUserDto, project: ProjectResource): boolean {
  if (user.organisationId !== project.organisationId) return false;
  if (user.role === 'owner' || user.role === 'admin') return true;
  if (user.role === 'client') return user.clientId === project.clientId;
  return project.projectManagerId === user.id || project.memberIds.includes(user.id);
}

export function canManageInvoice(user: AuthenticatedUserDto, invoice: ClientResource): boolean {
  if (user.organisationId !== invoice.organisationId) return false;
  return user.role === 'owner' || user.role === 'admin';
}
