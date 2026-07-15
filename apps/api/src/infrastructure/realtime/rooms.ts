export const roomNames = {
  organisation: (organisationId: string) => `organisation:${organisationId}`,
  staff: (organisationId: string) => `organisation:${organisationId}:staff`,
  client: (organisationId: string, clientId: string) =>
    `organisation:${organisationId}:client:${clientId}`,
  user: (organisationId: string, userId: string) => `organisation:${organisationId}:user:${userId}`,
  project: (organisationId: string, projectId: string) =>
    `organisation:${organisationId}:project:${projectId}`,
};
