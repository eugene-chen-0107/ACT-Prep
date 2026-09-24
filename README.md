# Northstar ACT

A free, AI-assisted ACT preparation platform. This repository starts as a Next.js modular monolith; the first milestone is a responsive landing page, not the full learning product.

## Architecture

- **Web application:** Next.js App Router, React, and strict TypeScript. Server Components render pages; client components are introduced only where interaction requires them. Route Handlers under `src/app/api` will expose authenticated, validated server APIs.
- **Domain modules:** `src/features` keeps practice, diagnostics, question bank, progress, plans, and account logic independent of page presentation. Shared product rules belong in domain services, not UI components or route handlers.
- **Persistence:** PostgreSQL is the durable source of truth. Drizzle ORM provides typed schema and migrations; `postgres` is the Node.js driver. Attempts, answers, generated content provenance, and progress should be persisted before analytics are derived.
- **Authentication:** Better Auth owns password/session flows and secure cookies. API routes must verify the session and authorize access to student-owned records before reading or writing them.
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

The domain and infrastructure folders are reserved for future work; application features beyond the landing page are intentionally not implemented yet.

## Dependencies

- Runtime: `next`, `react`, `react-dom`, `better-auth`, `drizzle-orm`, `postgres`, `zod`, `openai` (OpenAI-compatible client for the future OpenRouter adapter), `lucide-react`.
- Development: `typescript`, `tailwindcss`, `postcss`, `autoprefixer`, `@tailwindcss/forms`, `eslint`, `eslint-config-next`, and React/Node type packages.

No AI key, database, or auth configuration is needed to run the landing page. Those integrations will need credentials/configuration when implemented.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. To check types and create a production build, run `npm run typecheck` and `npm run build`.
