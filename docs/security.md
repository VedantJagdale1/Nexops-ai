# Security

## Authentication

- Passwords are validated for length and composition, then hashed with bcrypt using 12 rounds.
- Login performs a bcrypt comparison even when no user exists to reduce timing-based account discovery.
- Access JWTs are short-lived, audience/issuer checked, and carry user, organisation, and role claims.
- Opaque refresh tokens contain 384 bits of randomness. Only SHA-256 hashes are stored.
- Refresh tokens rotate on every use. Atomic consumption prevents concurrent reuse; detected reuse revokes the entire token family.
- Password reset revokes every active refresh token for the user.
- Refresh cookies are signed, HTTP-only, same-site, and secure in production. Access tokens remain in application memory rather than local storage.

## Authorization and tenant isolation

Authentication reloads the active user so disabled accounts and changed tenant membership take effect without waiting for access-token expiry. `requireOrganisation` and `requirePermission` are centralized middleware. `canAccessProject`, `canAccessClient`, and `canManageInvoice` centralize entity-level policy.

Tenant repositories must use `buildTenantFilter()`. It rejects direct or nested `organisationId` input and always combines the verified tenant with the domain query. Compound indexes begin with `organisationId`; tests cover cross-tenant denial at both repository-filter and policy levels.

## Input, transport, and logging

- Zod validates every authentication and invitation payload.
- Authentication endpoints are rate limited.
- Helmet, explicit credentialed CORS, request-size limits, and NoSQL operator sanitization run before routes.
- Every response carries a request ID.
- Structured logs redact authorization headers, cookies, passwords, token fields, and password hashes.
- Disabled email logs recipient and message type but never secure tokens. SMTP disables file and URL access.
- Multipart uploads accept one allow-listed file up to 10 MB. Random tenant-prefixed keys prevent caller-selected paths, local path resolution rejects traversal, and stored provider URLs are never returned to clients.
- Ticket internal notes are removed before client responses. Invoice and ticket reads return not-found semantics when client-account ownership does not match, limiting resource discovery.
- Socket handshakes accept server-verified access tokens, reload the active user, and never accept an organisation identifier from clients. Project rooms are tenant-qualified and require the same entity-access policy as REST.
- Staff and client ticket events use separate rooms, user notifications use identity-specific rooms, and chat sends require a prior authorised project join. Socket message bursts are rate-limited.
- Kanban task and comment events are published only to authorised, tenant-qualified project rooms. Comment requests derive organisation, project, task, and author identity from authenticated state; task-comment typing is ephemeral and contains no draft content.

## Operational requirements

Production deployments must use HTTPS, unique high-entropy secrets, a MongoDB replica set, a restricted database user, and an explicit client origin. SMTP, AI, storage, and cache credentials remain API-only environment variables.
