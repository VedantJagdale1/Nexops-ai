# API Overview

The API is served under `/api/v1` and uses JSON response envelopes. Validation errors return HTTP 422 with field details; authentication and authorization failures use stable error codes and include the request ID.

## Authentication routes

| Method | Route                   | Authentication            | Purpose                                                    |
| ------ | ----------------------- | ------------------------- | ---------------------------------------------------------- |
| `POST` | `/auth/register`        | Public, rate limited      | Create an organisation and owner                           |
| `POST` | `/auth/login`           | Public, rate limited      | Verify credentials and create a session                    |
| `POST` | `/auth/refresh`         | Signed refresh cookie     | Rotate refresh token and issue a new access token          |
| `POST` | `/auth/logout`          | Refresh cookie optional   | Revoke the current refresh token and clear the cookie      |
| `POST` | `/auth/forgot-password` | Public, rate limited      | Send a non-enumerating reset response                      |
| `POST` | `/auth/reset-password`  | Public reset token        | Consume reset token, replace password, revoke all sessions |
| `POST` | `/auth/verify-email`    | Public verification token | Mark the account email verified                            |
| `GET`  | `/auth/me`              | Bearer access token       | Return the current active user                             |
| `POST` | `/invitations`          | `user:invite` permission  | Invite a non-owner organisation member                     |
| `POST` | `/invitations/accept`   | Public invitation token   | Create the invited user and authenticated session          |

Access tokens are returned in response data and held in frontend memory. Refresh tokens are never returned in JSON; they are stored in signed, HTTP-only, same-site cookies scoped to `/api/v1`.

## Health routes

- `GET /health` returns process liveness.
- `GET /health/ready` reports MongoDB readiness.

## Tenant context

Protected handlers receive tenant identity only from the verified active user. Domain repositories use `buildTenantFilter()` to add the tenant as a mandatory `$and` condition and reject caller-supplied `organisationId` filters.

Project member and task assignee IDs are verified against the authenticated organisation before storage. Client users receive only their linked client record and projects. Project managers and developers receive only projects where they are the manager or a member.

## Delivery routes

All routes below require a bearer access token, an active organisation, and the named central permission.

| Method   | Route                                 | Permission        | Purpose                                    |
| -------- | ------------------------------------- | ----------------- | ------------------------------------------ |
| `GET`    | `/users`                              | `user:read`       | Paginated organisation member directory    |
| `GET`    | `/clients`                            | `client:read`     | Search, filter, sort, and page clients     |
| `POST`   | `/clients`                            | `client:create`   | Create a tenant-derived client             |
| `GET`    | `/clients/:clientId`                  | `client:read`     | Read an accessible client                  |
| `PATCH`  | `/clients/:clientId`                  | `client:update`   | Update an accessible client                |
| `DELETE` | `/clients/:clientId`                  | `client:delete`   | Delete an accessible client                |
| `GET`    | `/projects`                           | `project:read`    | Search and page accessible projects        |
| `POST`   | `/projects`                           | `project:create`  | Create a client project                    |
| `GET`    | `/projects/:projectId`                | `project:read`    | Read an accessible project                 |
| `PATCH`  | `/projects/:projectId`                | `project:update`  | Update project scope and membership        |
| `DELETE` | `/projects/:projectId`                | `project:delete`  | Delete a project                           |
| `GET`    | `/tasks`                              | `task:read`       | Read a project board                       |
| `POST`   | `/tasks`                              | `task:create`     | Create a positioned task                   |
| `GET`    | `/tasks/:taskId`                      | `task:read`       | Read a task                                |
| `PATCH`  | `/tasks/:taskId`                      | `task:update`     | Update task fields                         |
| `PATCH`  | `/tasks/:taskId/move`                 | `task:update`     | Persist a Kanban status and position       |
| `GET`    | `/tasks/:taskId/comments`             | `task:read`       | Read paginated task discussion history     |
| `POST`   | `/tasks/:taskId/comments`             | `task:comment`    | Persist and broadcast a task comment       |
| `DELETE` | `/tasks/:taskId`                      | `project:update`  | Delete a task                              |
| `GET`    | `/analytics/dashboard`                | `analytics:read`  | Role-scoped operational dashboard          |
| `GET`    | `/tickets`                            | `ticket:read`     | Search and filter accessible tickets       |
| `POST`   | `/tickets`                            | `ticket:create`   | Create an SLA-tracked ticket               |
| `GET`    | `/tickets/:ticketId`                  | `ticket:read`     | Read an accessible ticket                  |
| `PATCH`  | `/tickets/:ticketId`                  | `ticket:manage`   | Assign or transition a ticket              |
| `GET`    | `/tickets/:ticketId/messages`         | `ticket:read`     | Read the permitted discussion thread       |
| `POST`   | `/tickets/:ticketId/messages`         | `ticket:create`   | Add a reply or staff-only note             |
| `GET`    | `/invoices`                           | `invoice:read`    | Search accessible invoices                 |
| `POST`   | `/invoices`                           | `invoice:manage`  | Create a numbered invoice draft            |
| `GET`    | `/invoices/:invoiceId`                | `invoice:read`    | Read an accessible invoice                 |
| `PATCH`  | `/invoices/:invoiceId/status`         | `invoice:manage`  | Apply a valid billing transition           |
| `GET`    | `/documents`                          | `document:read`   | List accessible private file metadata      |
| `POST`   | `/documents`                          | `document:upload` | Upload a validated file (10 MB maximum)    |
| `GET`    | `/documents/:documentId/download`     | `document:read`   | Authorised file download                   |
| `DELETE` | `/documents/:documentId`              | `document:upload` | Soft-delete metadata and stored object     |
| `GET`    | `/notifications`                      | Authenticated     | Read the current user's notification inbox |
| `PATCH`  | `/notifications/:notificationId/read` | Authenticated     | Mark one owned notification read           |
| `PATCH`  | `/notifications/read-all`             | Authenticated     | Mark all owned notifications read          |
| `GET`    | `/projects/:projectId/messages`       | `chat:read`       | Paginated authorised project chat history  |

List endpoints accept bounded pagination, search, allow-listed sort fields, and domain filters. The task board returns the accessible project board ordered by status and position.

## Kanban concurrency

`PATCH /tasks/:taskId/move` accepts `status`, zero-based `position`, and `expectedUpdatedAt`. The repository updates only when the persisted timestamp matches the last version seen by the caller. A competing update returns HTTP `409` with `TASK_UPDATE_CONFLICT`; the web client restores its previous query cache and refetches the canonical board. Successful moves normalise positions in the target column, recalculate project progress, and publish the resulting task to authorised viewers. Remote clients reconcile both affected columns in memory without reloading the page.

Task comments are stored separately from tasks, tenant-scoped through the parent task and project access policy, and broadcast only after MongoDB persistence succeeds. Author profiles are loaded in one tenant-scoped query per history page.

## Support, billing, and file safeguards

Client ticket and invoice queries are always narrowed to the client account linked to the authenticated identity. Internal ticket messages are excluded from client history. Invoice totals are computed from integer minor units and thousandths-of-a-unit quantities using BigInt intermediates; discounts cannot produce a negative total. Invoice status changes follow an explicit state machine.

Documents are buffered up to 10 MB, MIME allow-listed, assigned random tenant-prefixed storage keys, and never expose host filesystem paths or provider URLs. Downloads re-run tenant and project access checks. Local storage is the development default; `STORAGE_PROVIDER=cloudinary` stores authenticated Cloudinary assets and requires all three Cloudinary credentials.

## Real-time collaboration

The Socket.IO endpoint shares the API origin and accepts the access token only through `handshake.auth.token` or a bearer header. Connections reload the active user before joining identity rooms. Project rooms are joined only after the same `ProjectService.requireAccessible()` policy used by REST succeeds. Message history remains REST-based; newly persisted messages, typing, presence, tasks, tickets, and notifications are delivered through Socket.IO. See [Socket events](socket-events.md) for the event contract.
