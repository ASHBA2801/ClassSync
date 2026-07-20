import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { defineConfig } from 'prisma/config';

// Prefer repo-root .env, then package-local .env
loadEnv({ path: resolve(import.meta.dirname, '../../.env') });
loadEnv({ path: resolve(import.meta.dirname, '.env') });
loadEnv();

/**
 * Prisma 7: connection URLs live here, not in schema.prisma.
 * Use DIRECT_URL (port 5432) for migrations — pooled (6543) hangs on advisory locks.
 * Runtime Prisma Client uses DATABASE_URL (pooled) via @prisma/adapter-pg.
 *
 * `prisma generate` does not need a live DB; a placeholder is fine when env is unset.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url:
      process.env.DIRECT_URL ??
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5432/postgres',
  },
});
