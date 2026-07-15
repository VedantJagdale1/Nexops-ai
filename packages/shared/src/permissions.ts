export const userRoles = ['owner', 'admin', 'project_manager', 'developer', 'client'] as const;

export type UserRole = (typeof userRoles)[number];

export const permissions = [
  'organisation:read',
  'organisation:update',
  'organisation:delete',
  'user:read',
  'user:invite',
  'user:update_role',
  'user:remove',
  'client:read',
  'client:create',
  'client:update',
  'client:delete',
  'project:read',
  'project:create',
  'project:update',
  'project:delete',
  'task:read',
  'task:create',
  'task:update',
  'task:comment',
  'ticket:read',
  'ticket:create',
  'ticket:manage',
  'invoice:read',
  'invoice:manage',
  'document:read',
  'document:upload',
  'chat:read',
  'chat:write',
  'analytics:read',
  'audit:read',
  'report:generate',
] as const;

export type Permission = (typeof permissions)[number];

const staffReadPermissions: readonly Permission[] = [
  'organisation:read',
  'user:read',
  'client:read',
  'project:read',
  'task:read',
  'ticket:read',
  'invoice:read',
  'document:read',
  'chat:read',
  'chat:write',
];

export const rolePermissions: Readonly<Record<UserRole, readonly Permission[]>> = {
  owner: permissions,
  admin: permissions.filter((permission) => permission !== 'organisation:delete'),
  project_manager: [
    ...staffReadPermissions,
    'client:create',
    'client:update',
    'project:create',
    'project:update',
    'task:create',
    'task:update',
    'task:comment',
    'ticket:create',
    'ticket:manage',
    'document:upload',
    'analytics:read',
    'report:generate',
  ],
  developer: [
    'organisation:read',
    'user:read',
    'client:read',
    'project:read',
    'task:read',
    'task:update',
    'task:comment',
    'ticket:read',
    'document:read',
    'document:upload',
    'chat:read',
    'chat:write',
    'analytics:read',
  ],
  client: [
    'client:read',
    'project:read',
    'task:read',
    'ticket:read',
    'ticket:create',
    'invoice:read',
    'document:read',
    'chat:read',
    'chat:write',
    'analytics:read',
  ],
};

export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role].includes(permission);
}
