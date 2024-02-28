import { initTRPC, TRPCError } from '@trpc/server'
import { type Context } from './clerk'
 
const t = initTRPC.context<Context>().create({})
 
// check if the user is signed in, otherwise throw a UNAUTHORIZED CODE
const isAuthed = t.middleware(({ next, ctx }) => {

  if (!ctx.auth.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({
    ctx: {
      auth: ctx.auth,
    },
  })
})
 
export const router = t.router
 
export const publicProcedure = t.procedure
 
// export this procedure to be used anywhere in your application
export const protectedProcedure = t.procedure.use(isAuthed)
