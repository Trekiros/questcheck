import { Collections } from "../mongodb";
import { User, UserSchema } from "@/model/user";
import { auth } from "@clerk/nextjs";
import { revalidateTag, unstable_cache } from "next/cache";
import { protectedProcedure, router } from "../trpc";

const tag = (userId: string) => `user:${userId}`

export const UserRouter = router({
    getSelf: protectedProcedure
        .query(async ({ ctx: { auth: { userId } } }) => {
            if (!userId) throw new Error('Unauthorized')
        
            const callback = async () => {
                const users = await Collections.users()
                const user: User = await users.findOne({ userId }, { projection: { _id: 0 }}) as User
        
                return user
            }
        
            return await (unstable_cache(callback, ["user"], { revalidate: 60 * 30, tags: [tag(userId)]}))()
        }),

    updateSelf: protectedProcedure
        .input(UserSchema.omit({ userId: true }))
        .mutation(async ({ input: $set, ctx: { auth: { userId } } }) => {
            const users = await Collections.users()
            const result = await users.findOneAndUpdate({ userId }, { $set }, { upsert: true })
            revalidateTag(tag(userId))
            return result
        }),
})
