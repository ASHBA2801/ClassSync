# ClassSync — Multi-Tenant School ERP

A multi-tenant, RBAC-secured School ERP platform built with Next.js 16, Prisma, PostgreSQL RLS, Auth.js, BullMQ, and Razorpay.

## Features

- **Multi-tenancy** with PostgreSQL Row-Level Security (RLS) backstop
- **Roles:** System Admin, School Admin, Teacher, Parent (students are records, not accounts)
- **Conflict-free class scheduler** (CSP backtracking with setup gatekeeper wizard)
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
- AWS S3 + Rekognition (cloud face recognition for attendance)
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

## Face Recognition (AWS Rekognition)

Teacher and staff attendance uses **geofence + face verification**. Faces are enrolled once, then verified asynchronously by the BullMQ worker via **AWS Rekognition** (fully managed cloud API).

### How it works

```
Browser (camera + GPS)
  → submit attendance action (geofence check)
  → BullMQ job queued
  → worker calls AWS Rekognition SearchFacesByImage
  → attendance marked PRESENT / FAILED / ESCALATED
```

| Step | Where |
|------|--------|
| Enroll face | `/teacher/attendance` or staff attendance panel |
| Mark attendance | Same page — camera + location required |
| Verify (async) | `npm run worker` process |
| Admin review | `/admin/attendance` (escalated cases) |

**Important:** The worker must be running for face verification to complete. Enrollment and attendance submission happen in the web app; matching runs in the worker.

### Environment variables

| Variable | Values | Purpose |
|----------|--------|---------|
| `FACE_PROVIDER` | `aws` (default) | Use AWS Rekognition |
| `FACE_PROVIDER` | `mock` | In-memory mock for local dev without AWS |
| `AWS_REGION` | e.g. `ap-south-1` | Rekognition region (Mumbai recommended for India) |
| `AWS_ACCESS_KEY_ID` | optional on EC2 | IAM user keys (if not using instance role) |
| `AWS_SECRET_ACCESS_KEY` | optional on EC2 | IAM user secret |

`.env.docker` sets `FACE_PROVIDER=mock` so local Docker dev works without Rekognition. For production, use `FACE_PROVIDER=aws`.

### Local development (mock provider)

When using Docker Compose + MinIO, copy `.env.docker` which includes:

```env
FACE_PROVIDER=mock
```

This enables the full attendance UI flow without AWS credentials. Verification uses an in-memory mock — not suitable for demo/production.

### Production (AWS Rekognition)

**Option A — EC2 IAM role (recommended)**

1. Create an IAM role for your EC2 instance.
2. Attach policies:
   - `AmazonRekognitionFullAccess` (or a tighter custom policy)
   - S3 access for document uploads (if not already attached)
3. Launch EC2 with that role — no access keys needed in `.env`.
4. Set in `.env`:

```env
FACE_PROVIDER=aws
AWS_REGION=ap-south-1
```

The face collection (`classsync-faces`) is **created automatically** on first enrollment.

**Option B — IAM user access keys**

```env
FACE_PROVIDER=aws
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
```

Ensure the IAM user has `rekognition:CreateCollection`, `rekognition:IndexFaces`, and `rekognition:SearchFacesByImage` permissions.

### AWS free tier and cost

New AWS accounts include a Rekognition free tier (typically 12 months):

| Operation | Free tier (approx.) |
|-----------|---------------------|
| Face enrollment | 1,000 images / month |
| Face search | 1,000 searches / month |
| Faces stored | 5,000 faces / month |

Hackathon / jury testing usually stays within free tier or costs only a few dollars beyond it.

### Testing face attendance

1. Start Postgres, Redis, web app, and **worker**.
2. Log in as `teacher@demo.com` / `teacher123`.
3. Go to **Mark Attendance** (`/teacher/attendance`).
4. Click **Enroll Face** — allow camera access.
5. Click **Start Camera**, allow location, then **Submit Attendance**.
6. Wait for status to change from `PROCESSING` → `PRESENT`.

**Geofence note:** Seeded demo school is at Bangalore (`12.9716, 77.5946`, 500 m radius). If testing from elsewhere, update campus location in **Admin → Settings** or increase the campus radius temporarily.

### Troubleshooting

| Issue | Fix |
|-------|-----|
| Stuck on `PROCESSING` | Ensure `npm run worker` is running |
| Enrollment fails | Check IAM permissions and `AWS_REGION` |
| Always `FAILED` | Re-enroll face; improve lighting; face the camera directly |
| Blocked by geofence | Update school campus coords/radius in admin settings |
| Using mock locally | Set `FACE_PROVIDER=mock` in `.env` |

## Deployment (Railway / Fly.io / AWS)

Deploy **two services** from the same repo:

1. **Web:** `npm run build && npm start`
2. **Worker:** `npm run worker` (required for face verification, notifications, payroll jobs)

Add managed PostgreSQL and Redis. For face recognition on AWS EC2, attach an IAM role with Rekognition access and set `FACE_PROVIDER=aws`.

## PWA Notes

- Install via browser "Add to Home Screen"
- iOS Safari: camera/geolocation work in installed PWA; background push is limited
- Offline page at `/offline`; attendance syncs via Background Sync API when available

## Timetable & Scheduling

The timetable module follows a strict sequential setup before generation:

1. **Grades & Sections** — `/admin/classes`
2. **Session (Period) Configuration** — `/admin/schedule/setup?step=2`
3. **Subject Mapping** — per-grade curriculum on grade detail pages
4. **Teacher Assignments & Free-Period Rules** — `/admin/schedule/setup?step=4`
5. **Review & Generate** — `/admin/schedule/setup?step=5`

Generation is blocked until all readiness checks pass (`src/lib/scheduler/readiness.ts`). The solver uses CSP backtracking with MRV ordering to enforce teacher/section overlap prevention, exact weekly period counts, and weekly free-period limits (max free/week, plus an optional min free/week that defaults to 1).

Setup wizard: `/admin/schedule/setup`  
View generated timetable: `/admin/schedule`

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
├── migrations/          # Prisma migrate history (init baseline)
├── migrations_archive/  # Superseded incremental migrations
└── rls/                 # Row-level security policies (run via npm run db:rls)
```
