import * as trpc from '@trpc/server'
import * as trpcNext from '@trpc/server/adapters/next'
import { getAuth } from '@clerk/nextjs/server'
 
interface AuthContext {
  auth: ReturnType<typeof getAuth>
}
 
export const createContextInner = async ({ auth }: AuthContext  ) => {
  return {
    auth,
  }
}
 
export const createContext = async (
  opts: trpcNext.CreateNextContextOptions
) => {
  return await createContextInner({ auth: getAuth(opts.req) })
}

export type Context = trpc.inferAsyncReturnType<typeof createContext>
