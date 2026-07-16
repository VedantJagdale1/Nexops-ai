# NexOps AI

NexOps AI is a multi-tenant client project management platform for software agencies and IT service companies. It unifies client records, project delivery, Kanban work, project chat, support, documents, invoicing, analytics, AI-assisted reporting, notifications, and audit history.

> Current status: Phases 1–6 are complete. The secure identity and tenancy foundation now includes tenant-safe delivery, support, billing, private documents, user notifications, dashboard APIs, and authenticated real-time project collaboration alongside a responsive workspace and persistent optimistic Kanban board.

## Foundation included

- npm workspace monorepo with strict TypeScript
- React, Vite, Tailwind CSS, React Router, and TanStack Query web foundation
- Express, MongoDB/Mongoose, Socket.IO, Zod, and Pino API foundation
- Central shared role and permission catalogue
- Production authentication flows with bcrypt password hashing and opaque rotating refresh tokens
- Organisation, identity, project-delivery, support, billing, document, notification, chat, and audit models
- Tenant-filter enforcement and entity-level access policy helpers
- Environment validation with safe local provider defaults
- Request IDs, secure headers, CORS, NoSQL sanitization, structured errors, and redacted logs
- MongoDB and Redis-ready Docker Compose stack
- Formatting, linting, type checking, tests, and build CI gates
- Initial architecture documentation and Mermaid diagrams
- Searchable and paginated client and project management
- Project membership and client-account access policies
- Persistent five-stage Kanban with conflict detection and optimistic rollback
- Real-time Kanban viewers, cross-client task moves, persisted task comments, and typing indicators
- Project progress recalculation from completed task data
- Responsive light/dark application shell and Recharts dashboard visualisations
- SLA-aware support tickets with client-safe discussions and private internal notes
- Integer-safe invoices with atomic organisation-specific numbering and printable views
- Authorised private document delivery with local and Cloudinary storage providers
- User-scoped notification inbox with unread state and polling-based badge updates
- Persisted project chat with authenticated Socket.IO rooms, typing indicators, and online presence
- Live task, ticket, mention, and notification delivery with room-level client isolation

## Architecture

The system is a TypeScript modular monolith with hard domain boundaries and tenant-scoped data access. See [Architecture](docs/architecture.md) for diagrams and design decisions.

```text
nexops-ai/
├── apps/
│   ├── api/                 # Express API and Socket.IO gateway
│   └── web/                 # React/Vite application
├── packages/
│   ├── eslint-config/       # Shared lint rules
│   ├── shared/              # Shared contracts and permissions
│   └── tsconfig/            # Strict TypeScript bases
├── docs/                    # Architecture and product documentation
├── .github/workflows/       # Continuous integration
└── docker-compose.yml
```

## Local setup

### Prerequisites

- Node.js 20.18 or newer
- npm 10.8 or newer
- MongoDB 7+ (MongoDB Atlas is supported) and optionally Redis, or Docker Desktop

### Run with local Node.js

1. Install dependencies: `npm install`
2. Copy `apps/api/.env.example` to `apps/api/.env` and update the development secrets.
3. Copy `apps/web/.env.example` to `apps/web/.env`.
4. Start MongoDB and Redis locally, then run `npm run dev`.
5. Open `http://localhost:5173`. The API health endpoint is `http://localhost:4000/api/v1/health`.

### Run with Docker

Run `docker compose up --build`. This starts the web app on port 5173, the API on port 4000, MongoDB on 27017, and Redis on 6379. Values embedded in Compose are local-only development credentials and must not be used in a deployed environment.

## Environment configuration

Backend variables are documented in `apps/api/.env.example`; frontend variables are in `apps/web/.env.example`. Startup fails with a concise validation report when required backend values are missing or invalid. AI defaults to the deterministic `mock` provider, email defaults to disabled, and storage defaults to local development storage.

When `EMAIL_ENABLED=false`, verification, recovery, and invitation emails are intentionally not delivered and only non-secret delivery metadata is logged. Enable SMTP for complete link delivery; tokens are never returned from public endpoints.

## Quality commands

| Command                | Purpose                          |
| ---------------------- | -------------------------------- |
| `npm run format:check` | Verify Prettier formatting       |
| `npm run lint`         | Run strict ESLint rules          |
| `npm run typecheck`    | Type-check every workspace       |
| `npm run test`         | Run API and web unit tests       |
| `npm run build`        | Build packages and applications  |
| `npm run validate`     | Run every required local CI gate |

## API conventions

All public API routes are versioned under `/api/v1`. Successful responses use `{ "success": true, "data": ..., "meta": ... }`; errors use a stable error code, safe message, details array, and request ID. Authentication and current delivery-domain routes are documented in [API overview](docs/api-overview.md). Socket authentication, rooms, acknowledgements, and events are documented in [Socket events](docs/socket-events.md). OpenAPI generation remains scheduled for Phase 9.

The interview assignment implementation and two-browser demonstration steps are documented in [Real-time Kanban assignment](docs/interview-assignment.md).

## Security baseline

The API applies secure headers, explicit credentialed CORS, JSON body limits, NoSQL operator sanitization, request IDs, centralized error mapping, structured log redaction, authentication rate limits, short-lived access tokens, hashed rotating refresh tokens, replay-family revocation, tenant filters, permission middleware, and entity-level access policies. See [Security](docs/security.md).

## Delivery roadmap

1. Repository assessment and architecture — complete
2. Monorepo, shared configuration, Docker, and environment foundation — complete
3. Models, authentication, tenant isolation, and permissions — complete
4. Clients, projects, tasks, dashboard, and persistent Kanban — complete
5. Tickets, invoices, documents, and notifications — complete
6. Authenticated Socket.IO chat and real-time domain events — complete
7. Provider-independent AI features and mock provider
8. Analytics, audit logs, and organisation settings
9. Full test suite, seed data, OpenAPI, and remaining documentation
10. Complete validation, security review, and deployment handoff

## Demo credentials

The comprehensive seed and documented development-only credentials are introduced in Phase 9. No credentials are currently created or implied.

## Known limitations

AI, expanded analytics, audit, and organisation-settings workflows are introduced in subsequent phases. Notification polling remains as a 30-second resilience fallback when a socket connection is unavailable. The in-memory Socket.IO adapter supports a single API instance; horizontal deployments require a Redis adapter. The S3 configuration value is reserved but intentionally rejected at startup; production file storage currently supports authenticated Cloudinary assets. Task detail editing, checklist interaction, and activity timelines remain in the delivery expansion. SMTP delivery is disabled by default.

## Planned documentation

The completed project will also include deployment, screenshots, AI configuration, known limitations, and future improvements. Architecture, database, API, socket, and security documentation are maintained in `docs/`.
