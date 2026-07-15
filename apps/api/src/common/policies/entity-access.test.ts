import { describe, expect, it } from 'vitest';

import { canAccessClient, canAccessProject, canManageInvoice } from './entity-access.js';

import type { AuthenticatedUserDto } from '@nexops/shared';

const developer: AuthenticatedUserDto = {
  id: 'developer-1',
  organisationId: 'org-a',
  name: 'Dev One',
  email: 'dev@example.com',
  role: 'developer',
  emailVerified: true,
};

describe('entity access policies', () => {
  it('denies access to every resource from a different organisation', () => {
    expect(canAccessClient(developer, { id: 'client-a', organisationId: 'org-b' })).toBe(false);
    expect(
      canAccessProject(developer, {
        organisationId: 'org-b',
        clientId: 'client-a',
        memberIds: ['developer-1'],
      }),
    ).toBe(false);
    expect(
      canManageInvoice(
        { ...developer, role: 'admin' },
        { organisationId: 'org-b', clientId: 'client-a' },
      ),
    ).toBe(false);
  });

  it('limits developers to assigned projects and clients to their own account', () => {
    expect(
      canAccessProject(developer, {
        organisationId: 'org-a',
        clientId: 'client-a',
        memberIds: ['developer-1'],
      }),
    ).toBe(true);
    expect(
      canAccessProject(developer, {
        organisationId: 'org-a',
        clientId: 'client-a',
        memberIds: [],
      }),
    ).toBe(false);

    const clientUser: AuthenticatedUserDto = { ...developer, role: 'client', clientId: 'client-a' };
    expect(canAccessClient(clientUser, { id: 'client-a', organisationId: 'org-a' })).toBe(true);
    expect(canAccessClient(clientUser, { id: 'client-b', organisationId: 'org-a' })).toBe(false);
  });
});
