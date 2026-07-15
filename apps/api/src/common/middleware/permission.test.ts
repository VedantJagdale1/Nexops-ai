import { roleHasPermission } from '@nexops/shared';
import { describe, expect, it } from 'vitest';

describe('central role permissions', () => {
  it('reserves organisation deletion for owners', () => {
    expect(roleHasPermission('owner', 'organisation:delete')).toBe(true);
    expect(roleHasPermission('admin', 'organisation:delete')).toBe(false);
  });

  it('allows developers to update tasks but not manage invoices or audit logs', () => {
    expect(roleHasPermission('developer', 'task:update')).toBe(true);
    expect(roleHasPermission('developer', 'invoice:manage')).toBe(false);
    expect(roleHasPermission('developer', 'audit:read')).toBe(false);
  });

  it('gives clients only client-facing workflow permissions', () => {
    expect(roleHasPermission('client', 'ticket:create')).toBe(true);
    expect(roleHasPermission('client', 'project:update')).toBe(false);
    expect(roleHasPermission('client', 'user:invite')).toBe(false);
  });
});
