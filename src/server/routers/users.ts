import { Collections } from "../mongodb";
import { User, UserSchema, newUser } from "@/model/user";
import { protectedProcedure, router } from "../trpc";
import { Prettify } from "@/model/utils";
import { UpdateFilter } from "mongodb";
import { Writeable } from "zod";
import { clerkClient } from "@clerk/nextjs";

export const UserRouter = router({
    getSelf: protectedProcedure
        .query(async ({ ctx: { auth: { userId } } }) => {
            if (!userId) throw new Error('Unauthorized')
        
            const users = await Collections.users()
            const user: Prettify<Omit<User, "userId">>|null = await users.findOne({ userId }, { projection: { _id: 0 }})

            if (user) {
                if (!user.isPlayer) user.playerProfile = newUser.playerProfile
                if (!user.isPublisher) user.publisherProfile = newUser.publisherProfile
            }

            console.log(user)

            return user
        }),

    updateSelf: protectedProcedure
        .input(UserSchema.omit({ userId: true }))
        .mutation(async ({ input, ctx: { auth } }) => {
            const users = await Collections.users()

            const existingUserName = await users.findOne({ userName: input.userName, userId: { $ne: auth.userId }})
            if (existingUserName) {
                throw new Error('Username taken')
            }

            const { publisherProfile, ...userClean } = input

            type UserWithoutId = Prettify<Omit<User, "userId">>
            type UserUpdate = UpdateFilter<UserWithoutId>
            type UserSet = Writeable<NonNullable<UserUpdate["$set"]>>
            const $set: UserSet = {
                ...userClean,
            }

            // Publisher readonly fields
            if (userClean.isPublisher) {
                if (publisherProfile.twitterProof) {
                    const fromAuth = auth.user?.externalAccounts.find(socialConnection => socialConnection.provider === 'x')?.username
                    if (publisherProfile.twitterProof!== fromAuth) {
                        throw new Error('You must link your twitter account to do this')
                    }

                    $set["publisherProfile.twitterProof"] = fromAuth
                }

                if (publisherProfile.facebookProof) {
                    const fromAuth = auth.user?.externalAccounts.find(socialConnection => socialConnection.provider === 'facebook')?.username
                    if (publisherProfile.twitterProof!== fromAuth) {
                        throw new Error('You must link your facebook account to do this')
                    }

                    $set["publisherProfile.facebookProof"] = fromAuth
                }
            }

            const result = await users.findOneAndUpdate({ userId: auth.userId }, { $set }, { upsert: true })
            return result
        }),

    deleteSelf: protectedProcedure
        .mutation(async ({ ctx }) => {
            const userId = ctx.auth.userId

            const usersDb = await Collections.users()

            await Promise.all([
                clerkClient.users.deleteUser(ctx.auth.userId),
                usersDb.findOneAndUpdate({ userId }, { $set: {
                    ...newUser,
                    userId,
                    userName: '[deleted user]',
                } }),
            ])
        }),

    isUsernameTaken: protectedProcedure
        .input(UserSchema.shape.userName)
        .mutation(async ({ input, ctx }) => {
            const users = await Collections.users()

            const existingUserName = await users.findOne({ userName: input, userId: { $ne: ctx.auth.userId }})
            return !!existingUserName
        })
})
