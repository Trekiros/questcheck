import { createContext } from '@/server/clerk';
import { appRouter } from '@/server/routers/root';
import * as trpcNext from '@trpc/server/adapters/next'

export default trpcNext.createNextApiHandler({
  router: appRouter,
  createContext,
});