# ClassSync

Multi-tenant school management SaaS — teachers & parents (Expo mobile) and admins (Next.js web) share one Postgres database on Supabase through a typed tRPC API. Apps never query the database directly.

## Stack (July 2026)

| Layer | Choice |
|-------|--------|
| Monorepo | Turborepo 2 + pnpm 10 |
| Web | Next.js 16, React 19, Tailwind 4 |
| Mobile | Expo SDK 57, Expo Router, NativeWind 4 |
| API | tRPC 11 (mounted on Next.js Route Handlers) |
| ORM | Prisma 7 + `@prisma/adapter-pg` |
| Auth / DB | Supabase Auth + Supabase Postgres |
| Validation | Zod 4 |

No Docker Compose — Postgres, Auth, and Storage stay on Supabase even in local development (deliberate simplification).

## Repository layout

```
apps/
  web/                 Next.js admin dashboard + /api/trpc
  mobile/              Expo teacher/parent app
packages/
  api-router/          tRPC routers + tenant middleware
  database/            Prisma schema, migrations, seed, client
  supabase-client/     Browser / server / mobile Supabase helpers
  shared-types/        Zod schemas + inferred types
  ui-web/              shadcn-style React components
  ui-mobile/           NativeWind / RN primitives
  config/              Shared TS / ESLint / Prettier
  utils/               Pure helpers
```

## Manual Supabase setup (one-time)

1. Go to [https://supabase.com](https://supabase.com) → **New project**. Pick a region and set a DB password.
2. **Authentication** → **Providers** → enable **Email** (Email/Password).
3. **Project Settings** → **API**:
   - Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_URL`
   - Copy **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - Copy **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (server-only — never ship to clients)
4. **Project Settings** → **Database** → **Connection string**:
   - **Transaction pooler** (port **6543**) → `DATABASE_URL` (append `?pgbouncer=true`)
   - **Direct** (port **5432**) → `DIRECT_URL` (Prisma migrations)
5. Copy `.env.example` → `.env` at the repo root and fill values. Also symlink or copy into `apps/web` / `packages/database` as needed (Next and Prisma load from cwd; root `.env` is loaded by seed via `dotenv` if you run from package, so prefer putting `.env` in root and loading it — see below).

### Prisma 7 + dual URLs

Prisma 7 no longer puts `url` / `directUrl` in `schema.prisma`. Instead:

- `packages/database/prisma.config.ts` uses **`DIRECT_URL`** for `migrate`
- Runtime `PrismaClient` uses **`DATABASE_URL`** (pooled) via `@prisma/adapter-pg`

### Create seed Auth users

1. Supabase Dashboard → **Authentication** → **Users** → **Add user**
2. Create four users (email/password), e.g.:
   - `superadmin@classsync.app` — **platform SUPER_ADMIN** (all schools)
   - `admin@riverside.academy` — **school ADMIN** (one tenant only)
   - `teacher@riverside.academy`
   - `parent@riverside.academy`
3. Copy each user UUID into `.env`:
   - `SEED_SUPER_ADMIN_USER_ID`
   - `SEED_ADMIN_USER_ID`
   - `SEED_TEACHER_USER_ID`
   - `SEED_PARENT_USER_ID`

**Roles:** `SUPER_ADMIN` has `tenantId = null` and uses `/platform`. School `ADMIN` is scoped to one tenant and uses `/dashboard`.

## Local development

### Prerequisites

- Node.js ≥ 22.13
- pnpm 10 (`corepack enable` then `corepack prepare pnpm@10.33.0 --activate`)

### Install & database

```bash
pnpm install
cp .env.example .env
# fill .env …

# From repo root (loads root .env for migrate if you export vars, or copy .env into packages/database)
pnpm db:migrate
pnpm db:seed
```

Tip: place a copy of `.env` in `packages/database/` as well so Prisma CLI and seed pick up `DATABASE_URL` / `DIRECT_URL` / `SEED_*`.

### Web

```bash
pnpm dev:web
# → http://localhost:3000
# Login → /dashboard shows health.ping (timestamp + tenant count)
```

### Mobile

```bash
pnpm dev:mobile
```

On a **physical device**, set `EXPO_PUBLIC_API_URL` to your machine's LAN IP (localhost will not work):

```
EXPO_PUBLIC_API_URL=http://192.168.x.x:3000/api/trpc
```

Also set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

After login, teacher/parent roles route to separate tab navigators; home screens call `health.ping`.

## Root scripts

| Script | Purpose |
|--------|---------|
| `pnpm dev` | Turborepo parallel `dev` |
| `pnpm dev:web` | Next.js only |
| `pnpm dev:mobile` | Expo start (separate terminal) |
| `pnpm build` | Build all packages/apps |
| `pnpm lint` / `pnpm type-check` | Quality gates |
| `pnpm db:migrate` / `db:seed` / `db:studio` | Database |

## Multi-tenancy

| Role | Scope | Web home |
|------|--------|----------|
| `SUPER_ADMIN` | Entire platform (`tenantId` is null) | `/platform` |
| `ADMIN` | One school | `/dashboard` |
| `TEACHER` / `PARENT` | One school | Mobile (and school web later) |

Every school-data Prisma query must include `tenantId`. Use `withTenantFilter()` for school roles. **Never** call it for `SUPER_ADMIN` — use `platformProcedure` / `tenant.*` or `withExplicitTenant(tenantId)`. Missing filters are critical security bugs. Postgres RLS is deferred to a later phase.

## What this scaffold proves

Login → `health.ping` → Supabase Postgres round-trip on **both** web and mobile.

## What to build next

1. Tenant onboarding / registration
2. Postgres RLS policies
3. Full student & attendance CRUD UIs
4. Parent progress + messaging
5. Vercel deploy + EAS Build/Update
6. AI agent monitoring (beyond `AgentLog` model stub)
