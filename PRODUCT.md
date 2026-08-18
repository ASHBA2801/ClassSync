# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Balanced multi-role educational ecosystem serving four distinct user groups:
- **School Admins & Operational Leadership:** Managing institutional configuration, conflict-free timetables, working calendars, employee records, payroll runs, settings, and per-tenant fee payment gateways.
- **Teachers & School Staff (Transport, Security, Maintenance, Leadership):** Verifying geofenced/face attendance, viewing daily schedules, initiating schedule swap requests, and submitting leave applications.
- **Parents:** Reviewing student records, submitting leave requests, accessing official documents, and settling school fees via preferred payment providers.
- **System Admins:** Provisioning multi-tenant school environments, global system health monitoring, and managing tenant boundaries.

## Product Purpose
ClassSync is an all-in-one multi-tenant School ERP that centralizes administration, scheduling, attendance, payroll, fee collection, and parent communication in a secure, role-based Web/PWA experience. Success means zero-conflict class timetables, effortless staff attendance verification, transparent financial processing, and strict operational clarity across all user roles.

## Positioning
An all-in-one multi-tenant School ERP engineered for zero-trust security and operational precision. ClassSync uniquely combines PostgreSQL Row-Level Security (RLS) data backstops with automated CSP backtracking class scheduling, geofenced AI face-verification attendance, and flexible per-tenant multi-provider fee collection.

## Operating Context
Operates across desktop administration consoles, classroom/entrance kiosks, and mobile parent/teacher PWA interfaces in diverse school environments. Supports low-latency camera image capture, GPS geofencing, PWA offline service worker caching, push notifications, and per-tenant payment gateway integrations (Razorpay, PhonePe, PayPal, Stripe).

## Capabilities and Constraints
- **Capabilities:**
  - Multi-tenant data architecture secured with PostgreSQL Row-Level Security (RLS) policies.
  - Role-based access control (RBAC) powered by Auth.js v5 JWT sessions with custom permission flags.
  - Conflict-free timetable scheduler using CSP backtracking with setup gatekeeper wizards and teacher schedule swap workflows.
  - Geofenced staff attendance with AWS Rekognition face verification queue and escalation handling.
  - Working-day calendar engine managing school holidays and custom operational rules.
  - Monthly payroll processing with salary slip generation and RazorpayX payout integration.
  - Parent portal for document retrieval, student leave applications, and multi-provider fee payments.
  - Standalone Hono HTTP worker service for asynchronous face verification, document AI extraction, and heavy background tasks.
- **Technical Constraints:**
  - Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Prisma ORM + PostgreSQL RLS.
  - Auth.js v5, Redis (rate limiting & idempotency), AWS S3 + Rekognition, Web Push (VAPID).
- **Terminology:**
  - School Admin, Teacher, Staff, Parent (students are managed records, not individual user accounts).
  - Geofence, Face Attendance Queue, Schedule Swap, Payroll Run, Working Day Rules.

## Brand Commitments
- **Name:** ClassSync
- **Visual Identity:** Modern Enterprise Blue / Slate aesthetic characterized by clean structural contrast, clear typography hierarchy, and professional authority.
- **Voice:** Reliable, structured, efficient, and user-centric.

## Evidence on Hand
- Complete Next.js 16 App Router application codebase (`src/app/`) with Prisma schema (`prisma/schema.prisma`), RLS policies (`prisma/rls/001_enable_rls.sql`), and seed scripts (`prisma/seed.ts`).
- Standalone Hono worker service implementation (`worker/src/node-server.ts`).
- PWA setup with service worker (`public/sw.js`) and manifest (`public/manifest.json`).
- Unit and integration test suites in `src/__tests__/`.
- *Absences:* No fabricated customer testimonials or fake benchmark claims.

## Product Principles
1. **Strict Multi-Tenant Isolation:** Security and data privacy are foundational, enforced at both application middleware and database RLS levels.
2. **Role-Tailored Clarity:** Interfaces and information architecture adapt specifically to the operational context of each role (Admin, Teacher, Staff, Parent).
3. **Operational Precision & Automation:** Eliminate administrative friction through automated conflict-free scheduling, geofenced face verification, and automated payroll runs.
4. **Resilient Mobile & Offline Readiness:** Critical daily workflows like attendance logging and schedule consultation operate reliably across desktop and mobile PWA environments.
