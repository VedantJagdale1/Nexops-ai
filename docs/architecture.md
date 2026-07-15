# NexOps AI Architecture

## Context

NexOps AI is a multi-tenant SaaS platform for agencies and IT service firms. It is implemented as a TypeScript monorepo with a React single-page application and an Express modular monolith. The modular monolith keeps deployment and local development straightforward while maintaining domain boundaries that can be extracted into services if scale warrants it.

```mermaid
flowchart LR
  Browser["React web application"]
  API["Express REST API"]
  WS["Socket.IO gateway"]
  Mongo[("MongoDB")]
  Redis[("Redis-compatible cache")]
  Files["Storage provider"]
  Mail["Email provider"]
  AI["AI provider or local mock"]

  Browser -->|"HTTPS /api/v1"| API
  Browser <-->|"authenticated WebSocket"| WS
  API --> Mongo
  WS --> Mongo
  API -.-> Redis
  WS -.-> Redis
  API --> Files
  API --> Mail
  API --> AI
```

## Runtime boundaries

### Web application

The web app uses feature-oriented modules. TanStack Query owns remote data and request lifecycle state. Zustand is limited to lightweight UI state such as theme, sidebar state, and ephemeral Kanban interactions. Forms use React Hook Form with Zod schemas shared with the API where appropriate.

### API application

Each backend domain follows the same dependency direction:

```mermaid
flowchart LR
  Route --> Middleware --> Controller --> Service --> Repository --> Model[("Mongoose model")]
  Service --> Audit["Audit service"]
  Service --> Events["Domain and real-time events"]
```

- Routes compose validation, authentication, tenant, and permission middleware.
- Controllers translate HTTP requests and responses without containing business rules.
- Services coordinate domain rules, transactions, notifications, audit entries, and provider calls.
- Repositories are the only normal path to Mongoose queries. Tenant-owned repositories require an organisation context at construction time.
- Models define indexes, invariants, serialization, and persistence types.

## Tenant isolation

All tenant-owned collections include `organisationId`. Authenticated requests derive the organisation from the verified identity; body and query parameters cannot override it. Tenant repositories merge `organisationId` into every filter and reject attempted organisation filters from callers. Entity-access policies add client and project membership constraints after the tenant boundary.

```mermaid
sequenceDiagram
  participant Browser
  participant Auth as Auth middleware
  participant Policy as Permission policy
  participant Repo as Tenant repository
  participant DB as MongoDB
  Browser->>Auth: Access token
  Auth->>Auth: Verify signature and session claims
  Auth->>Policy: User, organisation, requested action
  Policy->>Repo: Allowed operation with tenant context
  Repo->>DB: Query with mandatory organisationId
  DB-->>Repo: Tenant-scoped result
  Repo-->>Browser: Response envelope
```

Defence in depth includes compound tenant indexes, model serialization rules, explicit projections, cross-tenant integration tests, and socket room names that include the verified organisation identifier.

## Authentication

Access tokens are short-lived JWTs sent as bearer tokens. Refresh tokens are opaque random secrets stored in signed, secure, HTTP-only cookies. Only a SHA-256 hash and rotation metadata are persisted. Each refresh atomically consumes the old token and creates a replacement; replay revokes the affected token family. The SPA keeps access tokens in memory and restores sessions through the refresh cookie instead of browser storage.

```mermaid
sequenceDiagram
  participant User
  participant Web
  participant API
  participant DB
  User->>Web: Submit credentials
  Web->>API: POST /api/v1/auth/login
  API->>DB: Verify user and password hash
  API->>DB: Store refresh-token hash and family
  API-->>Web: Access token + HTTP-only refresh cookie
  Web->>API: Authenticated API request
  API-->>Web: Protected resource
  Web->>API: POST /api/v1/auth/refresh (cookie)
  API->>DB: Atomically consume and rotate token
  API-->>Web: New access token + rotated cookie
```

## Data and consistency decisions

- Money is stored in integer minor units and calculated with integer/decimal-safe helpers.
- Sequential invoice numbers use an organisation-scoped counter updated atomically.
- Unbounded messages, comments, ticket messages, task activity, and refresh tokens use separate collections rather than growing embedded arrays.
- Kanban ordering uses sortable positions plus a task version. Conflicting writes return a conflict response and trigger client reconciliation.
- Multi-document operations that require atomicity use MongoDB transactions in replica-set environments.

### Phase 4 delivery write path

Client, project, and task modules now implement the route-controller-service-repository boundary. Shared Zod contracts validate allow-listed fields, services enforce entity access and cross-organisation reference checks, and repositories add tenant filters to every normal query. The dashboard uses tenant-scoped aggregation pipelines and derives restricted project IDs before aggregating client, project-manager, or developer data.

```mermaid
sequenceDiagram
  participant UI as React Kanban
  participant Cache as TanStack Query cache
  participant API as Task API
  participant DB as MongoDB
  UI->>Cache: Optimistically move card
  UI->>API: PATCH move(status, position, expectedUpdatedAt)
  API->>DB: Tenant-scoped conditional update
  alt Timestamp matches
    DB-->>API: Updated task
    API->>DB: Normalise positions and project progress
    API-->>UI: Canonical task
    UI->>Cache: Refetch board
  else Competing write exists
    DB-->>API: No matching task version
    API-->>UI: 409 TASK_UPDATE_CONFLICT
    UI->>Cache: Restore snapshot and refetch
  end
```

### Phase 5 operational workflows

Tickets, invoices, documents, and notifications use the same mandatory tenant filter. Client identities receive an additional client-account constraint, while project documents also pass through the central project access policy. Ticket discussions are stored separately so threads can grow without inflating ticket records; internal notes are filtered at the repository boundary for client requests.

```mermaid
flowchart LR
  User["Authenticated user"] --> Policy["Permission and entity policy"]
  Policy --> Ticket["Ticket service"]
  Policy --> Invoice["Invoice service"]
  Policy --> Document["Document service"]
  Ticket --> Message[("Ticket messages")]
  Ticket --> Notify["Notification service"]
  Invoice --> Counter["Atomic tenant counter"]
  Invoice --> Notify
  Document --> Metadata[("Document metadata")]
  Document --> Storage["Local or authenticated Cloudinary storage"]
  Notify --> Inbox[("User-scoped notifications")]
```

Invoice values remain integer minor units end-to-end. Fractional quantities use thousandths, and calculations use BigInt intermediates before range-checking the persisted number. The document storage interface exposes only `store`, `read`, and `delete`; web clients receive metadata and use an authorised API download rather than a provider or filesystem URL.

## Provider abstractions

AI, storage, email, and cache services expose provider-independent interfaces. Development defaults are a deterministic mock AI provider, local private file storage, disabled/log-only email, and optional no-op caching. Production adapters are selected only from validated server environment variables; provider secrets never enter the web bundle.

## Phase 6 real-time boundary

The HTTP application and Socket.IO gateway share identity, project access, chat, and publisher dependencies. Socket authentication verifies a short-lived access token and reloads the active user. Every connection joins only its organisation, user, and either staff or linked-client room. Project joins call the central project access service before adding a tenant-qualified room.

```mermaid
sequenceDiagram
  participant Web as React client
  participant Socket as Socket gateway
  participant Policy as Project access service
  participant Chat as Chat service
  participant DB as MongoDB
  Web->>Socket: connect(auth access token)
  Socket->>Socket: verify token and reload user
  Web->>Socket: project:join(projectId)
  Socket->>Policy: requireAccessible(user, projectId)
  Policy-->>Socket: authorised
  Socket-->>Web: presence snapshot
  Web->>Socket: chat:send(content, mentions)
  Socket->>Chat: validate and create
  Chat->>DB: persist tenant-scoped message
  Chat-->>Web: chat:message to authorised room
```

Presence is connection-counted so one user with multiple tabs appears once. Typing state is ephemeral. Chat sends are limited per socket, and acknowledgements use typed success/error envelopes. The publisher routes tasks to project rooms, tickets to staff plus the linked client room, and notifications to an individual user room. A single-instance in-memory adapter is currently used; a Redis adapter is required before horizontally scaling the API.

## Observability and failure handling

Every request receives or propagates an `x-request-id`. Pino emits structured, redacted logs. Errors are normalized to stable codes and response envelopes. Health endpoints distinguish liveness from readiness. The HTTP server, Socket.IO, MongoDB, and provider clients close gracefully on termination.
