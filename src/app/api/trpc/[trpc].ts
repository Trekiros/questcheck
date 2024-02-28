import { createContext } from '@/server/clerk';
import { appRouter } from '@/server/router'
import * as trpcNext from '@trpc/server/adapters/next'

export default trpcNext.createNextApiHandler({
  router: appRouter,
  createContext,
});