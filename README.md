# Northstar ACT

A free, AI-assisted ACT preparation platform. This repository starts as a Next.js modular monolith; the first milestone is a responsive landing page, not the full learning product.

## Architecture

- **Web application:** Next.js App Router, React, and strict TypeScript. Server Components render pages; client components are introduced only where interaction requires them. Route Handlers under `src/app/api` will expose authenticated, validated server APIs.
- **Domain modules:** `src/features` keeps practice, diagnostics, question bank, progress, plans, and account logic independent of page presentation. Shared product rules belong in domain services, not UI components or route handlers.
- **Persistence:** PostgreSQL is the durable source of truth. Drizzle ORM provides typed schema and migrations; `postgres` is the Node.js driver. Attempts, answers, generated content provenance, and progress should be persisted before analytics are derived.
- **Authentication:** Better Auth owns password/session flows and secure cookies. Email verification is required, credential passwords use Better Auth's scrypt hashing, sessions are database-backed, and rate limits are persisted in PostgreSQL. Student APIs derive ownership from the validated session rather than client-supplied IDs.
- **AI and question sources:** A provider-agnostic question-generation interface sits behind server-only services. The initial AI adapter can use OpenRouter through the OpenAI-compatible SDK, with a model selected by environment configuration. A separate curated-question provider can later read vetted items from the database. Store model, prompt version, and review state with generated content; validate all model responses and never treat generation as a trusted source of facts.
- **Configuration and security:** Secrets live in ignored `.env.local`; `.env.example` documents variable names only. Keep AI and database credentials server-side, validate inputs at boundaries with Zod, rate-limit costly generation, and do not log secrets or sensitive student data.

### Request flow

1. A browser requests a page or calls a Next.js Route Handler.
2. The server authenticates the session, validates the request, and calls a feature-level service.
3. The service uses a repository for PostgreSQL reads/writes, or a question-provider/AI adapter for content.
4. The route returns a minimal typed result. Attempts and outcomes are written to PostgreSQL; dashboard summaries are computed from this source of truth.

The browser never calls the AI provider or database directly. Keep the initial deployment a single application and database, with explicit interfaces between domain code and infrastructure.

### Scale later

Start with a single deployable application and managed PostgreSQL. Add indexes and query monitoring around attempts and question lookups; cache safe, non-user-specific reads; add request quotas for generation. Move long-running generation, full-test scoring, and analytics aggregation into a job queue when synchronous request limits are reached. Add read replicas or precomputed aggregates when dashboard load warrants them. Extract services only when independent scaling or team ownership makes the operational cost worthwhile. AI providers remain swappable through the adapter interface.

## Initial layout

```text
src/
  app/                 App Router layout, landing page, global styles, future API routes
  components/          Shared presentational components
  features/            Product domains (practice, diagnostics, progress, plans, ...)
  lib/                 Shared infrastructure adapters and utilities
  db/                  Database connection, Drizzle schema, migrations
  types/               Shared contracts
.env.example           Environment variable template; contains no credentials
```

Workspace feature pages remain placeholders. Email/password authentication, protected workspace routes, profile editing, and owner-scoped student data primitives are implemented; dashboard learning functionality is intentionally not built. The ACT database models include shared section/topic/question catalogs and student-scoped profiles, practice sessions, immutable question-attempt history, versioned tests, test attempts, study plans/tasks, preferences, progress, and achievement records. Demo seed data is provided without creating any student credentials.

## Dependencies

- Runtime: `next`, `react`, `react-dom`, `better-auth`, `@better-auth/drizzle-adapter`, `drizzle-orm`, `postgres`, `resend` (server-side verification/reset email), `zod`, and `lucide-react`.
- Development: `typescript`, `tailwindcss`, `postcss`, `autoprefixer`, `@tailwindcss/forms`, `drizzle-kit`, `tsx`, `eslint`, `eslint-config-next`, and React/Node type packages.

## Authentication setup

Copy `.env.example` to `.env.local`, set a private PostgreSQL `DATABASE_URL`, generate `BETTER_AUTH_SECRET` using `openssl rand -base64 32`, and set `BETTER_AUTH_URL` to the exact app origin. Configure a verified Resend sending address using `AUTH_EMAIL_FROM` and the server-only `RESEND_API_KEY` for verification and password-reset delivery. Never prefix secrets with `NEXT_PUBLIC_`.

Generate and review schema migrations with `npm run db:generate`, then apply them to a development database with `npm run db:migrate`. Optionally seed original demo ACT content by setting `SEED_DEMO_DATA=1` in the local environment and running `npm run db:seed`; verify with `npm run db:verify` against a migrated development or disposable test database. Auth paths are `/signup`, `/login`, `/logout` (sign out is also available from the profile menu), `/forgot-password`, `/reset-password`, `/verify-email`, and `/profile`. Workspace pages are protected in the server layout.

For auth integration tests, provision a dedicated throwaway PostgreSQL database, set `TEST_DATABASE_URL` and a test `BETTER_AUTH_SECRET`, migrate that test database using `DATABASE_URL` pointed to it, then run `npm run test:auth`. The test suite skips when `TEST_DATABASE_URL` is absent and never sends real email; reset/verification messages are captured in memory. Never point test configuration at production.

No database, Better Auth, or Resend credentials are included in this repository. The legacy `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` template entries remain for a later server-side AI integration.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. To check types and create a production build, run `npm run typecheck` and `npm run build`.
