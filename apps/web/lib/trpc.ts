import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@classsync/api-router';

export const trpc = createTRPCReact<AppRouter>();
