# ClassSync — Multi-Tenant School ERP

A multi-tenant, RBAC-secured School ERP platform built with Next.js 16, Prisma, PostgreSQL RLS, Auth.js, BullMQ, and Razorpay.

## Features

- **Multi-tenancy** with PostgreSQL Row-Level Security (RLS) backstop
- **Roles:** System Admin, School Admin, Teacher, Parent (students are records, not accounts)
- **Conflict-free class scheduler** (CSP backtracking solver)
- **Teacher attendance** with geofence + face recognition queue + retry/escalation flow
- **Parent portal** for documents, leave requests, fee payments
- **Per-tenant Razorpay** payment integration with encrypted keys
- **PWA** with service worker, offline fallback, background sync for attendance
- **BullMQ workers** for face verification, notifications, scheduler jobs

## Tech Stack

- Next.js 16 (App Router) + TypeScript + Tailwind v4
- Auth.js v5 (JWT sessions with tenantId, role, permissions)
- Prisma + PostgreSQL with RLS
- BullMQ + Redis
- AWS S3 + Rekognition (pluggable face recognition provider)
- Razorpay (per-tenant keys)

## Getting Started

### Option A: Docker (recommended for local dev)

Starts PostgreSQL, Redis, and MinIO (S3-compatible storage):

```bash
docker compose up -d
cp .env.docker .env   # or merge into your existing .env

npm install
npm run db:generate
npm run db:push
npm run db:rls
npm run db:seed

npm run dev           # :3000
npm run worker        # separate terminal
```

Docker services:

| Service  | URL / Port                          |
|----------|-------------------------------------|
| Postgres | `localhost:5432` (user/pass: `postgres`/`postgres`, db: `classsync`) |
| Redis    | `localhost:6379`                    |
| MinIO    | API `:9000`, Console `:9001` (minioadmin/minioadmin) |

### Option B: Manual setup

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+

```bash
cp .env.example .env
# Edit DATABASE_URL, REDIS_URL, AUTH_SECRET, ENCRYPTION_KEY

npm install
npm run db:generate
npm run db:push
npm run db:rls    # Apply RLS policies
npm run db:seed   # Seed demo data + permissions
```

### Development

```bash
npm run dev       # Next.js app on :3000
npm run worker    # BullMQ workers (separate terminal)
```

### Demo Accounts (after seed)

| Role | Email | Password |
|------|-------|----------|
| System Admin | admin@classsync.app | admin123 |
| School Admin | schooladmin@demo.com | school123 |
| Teacher | teacher@demo.com | teacher123 |
| Parent | parent@demo.com | parent123 |

### Testing

```bash
npm test          # Unit tests (geofence, scheduler, encryption, attendance FSM)
```

Integration tests for RLS tenant isolation run when `DATABASE_URL` is set.

## Deployment (Railway / Fly.io)

Deploy two services from the same repo:

1. **Web:** `npm run build && npm start`
2. **Worker:** `npm run worker`

Add managed PostgreSQL and Redis add-ons.

## PWA Notes

- Install via browser "Add to Home Screen"
- iOS Safari: camera/geolocation work in installed PWA; background push is limited
- Offline page at `/offline`; attendance syncs via Background Sync API when available

## Project Structure

```
src/
├── app/           # Route groups per role portal
├── actions/       # Server Actions
├── components/    # UI components
├── lib/           # Auth, RBAC, DB, scheduler, payments, etc.
├── workers/       # BullMQ worker process
└── middleware.ts  # Auth + route protection
prisma/
├── schema.prisma
├── seed.ts
└── migrations/rls/
```
