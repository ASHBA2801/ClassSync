# ClassSync

AI-powered school management platform with a three-tier architecture: React admin web, React Native mobile apps, and an Express backend backed by PostgreSQL.

## Project Structure

```
ClassSync/
├── Frontend-web/       React (Vite) — Admin dashboard, pitch deck, AI agent hub
├── Frontend-mobile/    React Native (Expo) — Teacher & parent mobile apps
└── Backend/            Express + Node.js + PostgreSQL (Prisma ORM)
```

## Stack

| Layer | Technology |
|-------|------------|
| Web | React 18, Vite |
| Mobile | React Native, Expo SDK 54, Expo Router |
| Backend | Node.js, Express |
| Database | PostgreSQL on [Neon](https://neon.tech) (Prisma ORM) |
| Real-time | Server-Sent Events (SSE) |

## Prerequisites

- Node.js ≥ 18
- [Neon](https://neon.tech) account (free tier works)
- Expo Go app (for mobile testing on device)

## Setup

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Configure environment

Copy `.env.example` to `.env` at the repo root.

In the [Neon console](https://console.neon.tech), create a project and open **Connection details**. Copy both connection strings:

| Variable | Neon setting | Used for |
|----------|--------------|----------|
| `DATABASE_URL` | **Pooled** connection (hostname ends with `-pooler`) | Express API at runtime |
| `DIRECT_URL` | **Direct** connection (no `-pooler`) | `npm run db:migrate` only |

Example:

```
DATABASE_URL=postgresql://user:pass@ep-xxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
PORT=5000
```

For mobile on a physical device, set your machine's LAN IP:

```
EXPO_PUBLIC_API_URL=http://192.168.x.x:5000/api
```

### 3. Database (Neon PostgreSQL)

```bash
npm run db:migrate
npm run db:seed
```

For production or CI, apply migrations without prompts:

```bash
npm run db:deploy
```

The backend falls back to an in-memory store if `DATABASE_URL` is not set, so you can demo the wireframe without PostgreSQL.

### 4. Run locally

Terminal 1 — Backend (port 5000):

```bash
npm run dev:backend
```

Terminal 2 — Web (port 3000, proxies `/api` to backend):

```bash
npm run dev:web
```

Terminal 3 — Mobile:

```bash
npm run dev:mobile
```

Open http://localhost:3000 for the admin web dashboard.

## Mobile (Expo Go) troubleshooting

If Expo Go shows **"Failed to download remote update"**:

1. **Same network** — Phone and PC must be on the same Wi‑Fi (not mobile data).
2. **Use Expo Go mode** — The dev server must show `Using Expo Go` and a URL like `exp://YOUR_IP:8081`. If it shows `localhost` or `development build`, press `s` in the terminal to switch back to Expo Go.
3. **Free port 8081** — Stop other Metro/Expo processes so the server uses the default port (QR codes break if an old server is still on 8081 while a new one runs on 8082).
4. **Windows Firewall** — Allow Node.js on private networks when prompted.
5. **Tunnel fallback** — If LAN still fails (guest Wi‑Fi, hotspot isolation), run:
   ```bash
   npm run dev:mobile:tunnel
   ```
   Scan the new QR code (uses Expo's tunnel instead of LAN).
6. **Update Expo Go** — Install the latest Expo Go from the Play Store / App Store (this project uses **Expo SDK 54**).

Set `EXPO_PUBLIC_API_URL` in `.env` to your PC's Wi‑Fi IP so API calls work after the app loads:
```
EXPO_PUBLIC_API_URL=http://YOUR_WIFI_IP:5000/api
```

## Features (Wireframe)

### Admin Web (`Frontend-web`)
- Multi-school tenant switcher
- Real-time AI alert feed (SSE)
- Agent hub — toggle and trigger AI agents
- Timetable conflict solver demo
- Data isolation verification
- Interactive pitch deck presentation

### Teacher Mobile (`Frontend-mobile`)
- Bulk attendance marking (< 2 min)
- Grade entry with AI agent trigger
- Dashboard with active alerts

### Parent Mobile (`Frontend-mobile`)
- Child progress overview
- Homework tracker
- Real-time alert notifications

### Backend (`Backend`)
- REST API for all school operations
- 6 AI agents (attendance, grades, homework, fees, behavioral, reports)
- SSE real-time event stream
- PostgreSQL persistence via Prisma

## Root Scripts

| Script | Purpose |
|--------|---------|
| `npm run install:all` | Install all three projects |
| `npm run dev:backend` | Start Express API |
| `npm run dev:web` | Start React admin dashboard |
| `npm run dev:mobile` | Start Expo mobile app |
| `npm run db:migrate` | Run Prisma migrations (uses `DIRECT_URL`) |
| `npm run db:deploy` | Apply migrations in production/CI |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Open Prisma Studio |
