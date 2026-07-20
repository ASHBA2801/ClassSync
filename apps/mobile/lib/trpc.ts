import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@classsync/api-router';

export const trpc = createTRPCReact<AppRouter>();

/**
 * Point EXPO_PUBLIC_API_URL at the web app's tRPC endpoint.
 * Physical devices cannot use localhost — use your machine LAN IP, e.g.
 *   EXPO_PUBLIC_API_URL=http://192.168.1.42:3000/api/trpc
 */
export function getApiUrl(): string {
  return process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/trpc';
}
