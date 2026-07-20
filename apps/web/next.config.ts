import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@classsync/api-router',
    '@classsync/database',
    '@classsync/shared-types',
    '@classsync/supabase-client',
    '@classsync/ui-web',
    '@classsync/utils',
  ],
  serverExternalPackages: [
    '@prisma/client',
    '@prisma/client-runtime-utils',
    '@prisma/adapter-pg',
    'pg',
  ],
};

export default nextConfig;
