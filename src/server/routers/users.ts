import { Collections } from "../mongodb";
import { MutableUser, MutableUserSchema, User, UserSchema, newUser } from "@/model/user";
import { protectedProcedure, publicProcedure, router } from "../trpc";
import { Prettify } from "@/model/utils";
import { UpdateFilter } from "mongodb";
import { Writeable } from "zod";
import { clerkClient } from "@clerk/nextjs";
import { User as ClerkUser } from "@clerk/backend";

export const UserRouter = router({
    getSelf: publicProcedure
        .query(async ({ ctx: { auth: { userId } } }) => {
            if (!userId) return null
        
            const users = await Collections.users()
            const user: Prettify<MutableUser>|null = await users.findOne({ userId }, { 
                projection: { _id: 0, userId: 0, userNameLowercase: 0
            }})

            // Just in case these fields weren't deleted properly.
            if (user) {
                if (!user.isPlayer) user.playerProfile = newUser.playerProfile
                if (!user.isPublisher) user.publisherProfile = newUser.publisherProfile
            }

            return user
        }),

    updateSelf: protectedProcedure
        .input(MutableUserSchema)
        .mutation(async ({ input, ctx: { auth } }) => {
            const users = await Collections.users()

            const existingUserName = await users.findOne({ userNameLowercase: input.userName.toLowerCase(), userId: { $ne: auth.userId }})
            if (existingUserName) {
                throw new Error('Username taken')
            }

            const { publisherProfile, ...userClean } = input

            type UserWithoutId = Prettify<Omit<User, "userId">>
            type UserUpdate = UpdateFilter<UserWithoutId>
            type UserSet = Writeable<NonNullable<UserUpdate["$set"]>>
            const $set: UserSet = {
                ...userClean,
                userNameLowercase: input.userName.toLowerCase(),
            }

            // Publisher readonly fields. Flattening the set avoids overwriting the manual verification process
            if (userClean.isPublisher) {
                let user: ClerkUser|null = null;

                if (publisherProfile.twitterProof) {
                    user = await clerkClient.users.getUser(auth.userId)
                    
                    const fromAuth = user.externalAccounts.find(socialConnection => socialConnection.provider === 'oauth_x')?.username
                    if (publisherProfile.twitterProof !== fromAuth) {
                        throw new Error('You must link your twitter account to do this')
                    }

                    $set["publisherProfile.twitterProof"] = fromAuth
                } else {
                    $set["publisherProfile.twitterProof"] = ''
                }

                if (publisherProfile.facebookProof) {
                    if (!user) user = await clerkClient.users.getUser(auth.userId)

                    const fromAuth = auth.user?.externalAccounts.find(socialConnection => socialConnection.provider === 'oauth_facebook')?.username
                    if (publisherProfile.twitterProof!== fromAuth) {
                        throw new Error('You must link your facebook account to do this')
                    }

                    $set["publisherProfile.facebookProof"] = fromAuth
                } else {
                    $set["publisherProfile.facebookProof"] = ''
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

            const existingUserName = await users.findOne({ userNameLowercase: input.toLowerCase(), userId: { $ne: ctx.auth.userId }})
            return !!existingUserName
        })
})
