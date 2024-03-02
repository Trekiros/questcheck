import { Collections } from "../mongodb";
import { User, UserSchema } from "@/model/user";
import { protectedProcedure, router } from "../trpc";
import { cache, invalidate } from "./cache";
import { Prettify } from "@/model/utils";

const tag = (userId: string) => `user:${userId}`

export const UserRouter = router({
    getSelf: protectedProcedure
        .query(async ({ ctx: { auth: { userId } } }) => {
            if (!userId) throw new Error('Unauthorized')
        
            return await cache(tag(userId), async () => {
                const users = await Collections.users()
                const user: Prettify<Omit<User, "userId">>|null = await users.findOne({ userId }, { projection: { _id: 0 }})
        
                return user
            })
        }),

    updateSelf: protectedProcedure
        .input(UserSchema.omit({ userId: true }))
        .mutation(async ({ input: $set, ctx: { auth: { userId } } }) => {
            const users = await Collections.users()
            const result = await users.findOneAndUpdate({ userId }, { $set }, { upsert: true })
            invalidate(tag(userId))
            return result
        }),
})
