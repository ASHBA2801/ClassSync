# ClassSync — Multi-Tenant School ERP

A multi-tenant, RBAC-secured School ERP platform built with Next.js 16, Prisma, PostgreSQL RLS, Auth.js, BullMQ, and multi-provider payments.

## Features

- **Multi-tenancy** with PostgreSQL Row-Level Security (RLS) backstop
- **Roles:** System Admin, School Admin, Teacher, Staff, Parent (students are records, not accounts)
- **Employee management** with job types (teaching, transport, security, maintenance, leadership, and more)
- **Conflict-free class scheduler** (CSP backtracking with setup gatekeeper wizard + swap requests)
- **Teacher & staff attendance** with geofence + face recognition queue + retry/escalation flow
- **Working calendar** for school holidays and working-day rules
- **Payroll & payouts** (monthly runs, salary slips, RazorpayX payouts when configured)
- **Parent portal** for documents, leave requests, and fee payments
- **Multi-provider fee payments** — Razorpay, PhonePe, PayPal, Stripe (per-tenant encrypted keys)
- **PWA** with service worker, offline fallback, background sync for attendance
- **BullMQ workers** for face verification, notifications, document AI, and payroll jobs
- **Campus map picker** via Google Maps (optional; used in Admin → Settings)

## Tech Stack

- Next.js 16 (App Router) + TypeScript + Tailwind v4
- Auth.js v5 (JWT sessions with tenantId, role, permissions)
- Prisma + PostgreSQL with RLS
- BullMQ + Redis
- AWS S3 + Rekognition (cloud face recognition for attendance)
- Razorpay / PhonePe / PayPal / Stripe (per-tenant fee providers)
- RazorpayX (optional staff salary payouts)
- Google Maps (campus geofence location picker)
- Web Push (VAPID)

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

#### Prerequisites

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
| Staff (Driver) | driver@demo.com | staff123 |
| Staff (Security) | security@demo.com | staff123 |
| Staff (Cleaner) | cleaner@demo.com | staff123 |
| Parent | parent@demo.com | parent123 |

### Testing

```bash
npm test          # Unit tests (geofence, scheduler, encryption, attendance FSM, employees)
```

Integration tests for RLS tenant isolation run when `DATABASE_URL` is set.

## Environment Variables

Copy from `.env.example` (manual) or `.env.docker` (Docker Compose + MinIO + mock face provider).

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis for BullMQ |
| `AUTH_SECRET` | Yes | Auth.js session secret |
| `ENCRYPTION_KEY` | Yes | 64-char hex (32 bytes) for encrypting payment/payout secrets |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Prod* | S3 + Rekognition (optional on EC2 with IAM role) |
| `AWS_REGION` | Yes for AWS | e.g. `ap-south-1` |
| `S3_BUCKET` | Yes | Upload bucket name |
| `S3_ENDPOINT` | Local only | e.g. `http://localhost:9000` for MinIO |
| `FACE_PROVIDER` | No | `aws` (default) or `mock` for local dev |
| `RAZORPAY_PLATFORM_KEY` | No | Optional platform-level Razorpay key |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Push | Web Push credentials |
| `NEXT_PUBLIC_APP_URL` / `NEXTAUTH_URL` | Yes | App URL (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Optional | Campus location map picker |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | Optional | Google Maps Map ID for the picker |

\* On EC2, prefer an instance IAM role instead of long-lived access keys.

**Per-school secrets (not in `.env`):** fee provider keys (Razorpay, PhonePe, PayPal, Stripe) and RazorpayX payout credentials are configured in **Admin → Settings**. Use test keys (e.g. `rzp_test_*`) for local demos.

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

**Geofence note:** Seeded demo school is at Bangalore (`12.9716, 77.5946`, 500 m radius). If testing from elsewhere, update campus location in **Admin → Settings** (map picker needs Google Maps env vars) or increase the campus radius temporarily.

### Troubleshooting

| Issue | Fix |
|-------|-----|
| Stuck on `PROCESSING` | Ensure `npm run worker` is running |
| Enrollment fails | Check IAM permissions and `AWS_REGION` |
| Always `FAILED` | Re-enroll face; improve lighting; face the camera directly |
| Blocked by geofence | Update school campus coords/radius in admin settings |
| Using mock locally | Set `FACE_PROVIDER=mock` in `.env` |

## Fees & Payments

Parents pay fees from `/parent/fees`. Each school enables providers in **Admin → Settings**:

| Provider | Typical use |
|----------|-------------|
| Razorpay | India — UPI, cards, net banking (`rzp_test_*` for test mode) |
| PhonePe | India — UPI / wallet |
| PayPal | International |
| Stripe | Global card checkout |

Secrets are encrypted at rest with `ENCRYPTION_KEY`. Webhooks live under `/api/webhooks/{provider}/[schoolId]`.

## Payroll & Payouts

School admins manage employees at `/admin/employees` and payroll at `/admin/employees/payroll`.

- Salary components and bank accounts must be complete before payout readiness passes
- Optional **RazorpayX** auto-payouts are configured per school (not via root `.env`)
- Teachers/staff view slips under `/teacher/payroll` or `/staff/payroll`
- Worker processes payout jobs — keep `npm run worker` running

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
Teacher swaps: `/teacher/schedule/swaps`

## Deployment (Railway / Fly.io / AWS)

Deploy **two services** from the same repo:

1. **Web:** `npm run build && npm start`
2. **Worker:** `npm run worker` (required for face verification, notifications, payroll jobs)

Add managed PostgreSQL and Redis. For face recognition on AWS EC2, attach an IAM role with Rekognition access and set `FACE_PROVIDER=aws`. Point `S3_*` at a real bucket (not MinIO) in production.

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
├── lib/           # Auth, RBAC, DB, scheduler, payments, payroll, face, etc.
├── workers/       # BullMQ worker process
└── middleware.ts  # Auth + route protection
prisma/
├── schema.prisma
├── seed.ts
├── migrations/          # Prisma migrate history (init baseline)
├── migrations_archive/  # Superseded incremental migrations
└── rls/                 # Row-level security policies (run via npm run db:rls)
```
