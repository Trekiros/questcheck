import { Collections } from "../mongodb";
import { MutableUserSchema, User, UserSchema, newUser } from "@/model/user";
import { protectedProcedure, router } from "../trpc";
import { Prettify, keys } from "@/model/utils";
import { ObjectId, UpdateFilter } from "mongodb";
import { Writeable, z } from "zod";
import { clerkClient } from "@clerk/nextjs";
import { ReviewInputSchema } from "@/model/reviews";
import { ApplicationStatusMap } from "@/model/playtest";
import { getDiscordServers } from "../discord";
import { NotificationSettingSchema } from "@/model/notifications";
import { getYoutubeInfo } from "../youtube";

export type Permissions = {
    canCreate: boolean,
    admin: boolean,
}

const adminConfKey = "ADMIN_USERID"

export async function getPermissions(userId: string|null): Promise<{ user: User|null, permissions: Permissions }> {
    if (!userId) return {user: null, permissions: { canCreate: false, admin: false } }

    const playtests = await Collections.playtests()
    const users = await Collections.users()
    
    const [ userInfo, recentPlaytests ] = await Promise.all([
        users.findOne({ userId }),
        playtests.countDocuments({ userId, createdTimestamp: { $gte: Date.now() - 24 * 60 * 60 * 1000 } }),
    ])

    if (userId === process.env[adminConfKey]) return  { user: userInfo, permissions: { canCreate: true, admin: true }}

    if (
        !userInfo
     || userInfo.banned
     || !userInfo.isPublisher
     || (
            !userInfo.publisherProfile.youtubeProof
         && !userInfo.publisherProfile.twitterProof
         && !userInfo.publisherProfile.manualProof
     )
     || (recentPlaytests >= 3)
    ) return { user: userInfo, permissions: { canCreate: false, admin: false } }

    return  { user: userInfo, permissions: { canCreate: true, admin: false } }
}

const updateSelf = protectedProcedure
    .input(MutableUserSchema)
    .mutation(async ({ input, ctx: { auth } }) => {
        const users = await Collections.users()

        const existingUserName = await users.findOne({ userNameLowercase: input.userName.toLowerCase(), userId: { $ne: auth.userId }})
        if (existingUserName) {
            throw new Error('Username taken')
        }

        const { publisherProfile, playerProfile, ...userClean } = input

        const clerkUser = await clerkClient.users.getUser(auth.userId)
        const emails = clerkUser.emailAddresses.map(e => e.emailAddress)

        type UserWithoutId = Prettify<Omit<User, "userId">>
        type UserUpdate = UpdateFilter<UserWithoutId>
        type UserSet = Writeable<NonNullable<UserUpdate["$set"]>>
        const $set: UserSet = {
            ...userClean,
            userNameLowercase: input.userName.toLowerCase(),
        }

        // Player notification fields. Updating the notifications uses a different endpoint, so we only update the systems here.
        if (userClean.isPlayer) {
            $set['playerProfile.systems'] = playerProfile.systems
            $set['playerProfile.creditName'] = playerProfile.creditName
        }

        // Publisher readonly fields. Flattening the set avoids overwriting the manual verification process
        if (userClean.isPublisher) {
            if (publisherProfile.twitterProof) {
                const fromAuth = clerkUser.externalAccounts.find(socialConnection => socialConnection.provider === 'oauth_x')?.username
                if (publisherProfile.twitterProof !== fromAuth) {
                    throw new Error('You must link your twitter account to do this')
                }

                $set["publisherProfile.twitterProof"] = fromAuth
            } else {
                $set["publisherProfile.twitterProof"] = ''
            }

            if (publisherProfile.youtubeProof) {
                const youtubeInfo = await getYoutubeInfo(auth.userId)

                if (youtubeInfo.status !== 'success') {
                    throw new Error('You must link your youtube account to do this')
                }
                
                $set["publisherProfile.youtubeProof"] = youtubeInfo.channelId
            } else {
                $set["publisherProfile.youtubeProof"] = ''
            }
        }

        const result = await users.updateOne(
            { userId: auth.userId },
            {
                $set,
                $addToSet: { emails: { $each: emails } },
                $setOnInsert: {
                    playerReviews: [],
                    'playerProfile.notifications': [],

                    // Only $setOnInsert playerProfile.systems if the user is not already going to set it, otherwise it causes a path conflict
                    ...((!input.isPlayer)
                        ? { 'playerProfile.systems': [] }
                        : {}
                    ),

                    // Only $setOnInsert publisherProfile if the $set won't already create it, otherwise it causes a path conflict.
                    ...((!input.isPublisher || !keys($set).find(key => key.startsWith('publisherProfile')))
                        ? { publisherProfile: { } }
                        : {}
                    ),
                },
            },
            { upsert: true },
        )

        // Re-ban a user if they tried to bypass a ban by deleting their data.
        if (result.upsertedId) {
            const bannedUsers = await Collections.bannedUsers()
            const isBanned = await bannedUsers.countDocuments({ email: {
                $in: emails
            }})

            if (!!isBanned) {
                await users.updateOne({ _id: result.upsertedId }, { banned: true })
            }
        }
    })

const updateNotifications = protectedProcedure
    .input(z.object({
        notifications: z.array(NotificationSettingSchema),
        dmOnAccept: z.string(),
        dmOnApply: z.string(),
    }))
    .mutation(async ({ input: { notifications, dmOnAccept, dmOnApply }, ctx }) => {
        const discordServers = await getDiscordServers(ctx.auth.userId)
        if (discordServers.status === 'No Discord Provider') throw new Error('Unauthorized')

        // The update is allowed if no conflicting notification settings are found
        const isAllowed = !notifications.find(notification => {
            if (notification.target.type === 'channel') {
                const serverId = notification.target.serverId
                const matchingServer = discordServers.servers.find(server => server.id === serverId)

                if (!matchingServer) return true

                const channelId = notification.target.channelId
                const matchingChannel = matchingServer.channels.find(channel => channel.id === channelId)

                if (!matchingChannel) return true
            } 
            
            else if (notification.target.userId !== discordServers.discordUserId) return true;

            return false
        })

        if (!isAllowed) throw new Error('Unauthorized')

        const userCol = await Collections.users()
        const result = await userCol.updateOne(
            { userId: ctx.auth.userId },
            { $set: {
                'playerProfile.notifications': notifications,
                'playerProfile.dmOnAccept': !!dmOnAccept ? discordServers.discordUserId : '',
                'playerProfile.dmOnApply': !!dmOnApply ? discordServers.discordUserId : '',
            }},
        )

        return !!result.modifiedCount
    })

const deleteSelf = protectedProcedure
    .mutation(async ({ ctx }) => {
        const userId = ctx.auth.userId

        const userCol = await Collections.users()
        const playtestCol = await Collections.playtests()

        await Promise.allSettled([
            clerkClient.users.deleteUser(ctx.auth.userId),

            // Delete all data from the user's profile
            userCol.findOneAndUpdate({ userId }, { $set: {
                ...newUser,
                userId,
                userName: '[deleted user]',
            } }),

            // Close all playtests created by this user
            playtestCol.updateMany(
                { userId, closedManually: { $ne: true } },
                { $set: { closedManually: true } },
            ),

            // Reject all pending applications by this user
            playtestCol.updateMany(
                { applications: { $elemMatch: {
                    applicantId: userId,
                    status: ApplicationStatusMap.pending,
                }}},
                { $set: {
                    "applications.$.status": ApplicationStatusMap.rejected,
                }},
            ),
        ])
    })

const isUsernameTaken = protectedProcedure
    .input(UserSchema.shape.userName)
    .mutation(async ({ input, ctx }) => {
        const users = await Collections.users()

        const existingUserName = await users.findOne({ userNameLowercase: input.toLowerCase(), userId: { $ne: ctx.auth.userId }})
        return !!existingUserName
    })

    
const review = protectedProcedure
    .input(z.object({ playtesterId: z.string(), review: ReviewInputSchema }))
    .mutation(async ({ input, ctx }) => {
        // 1. Check if the user is allowed to submit the review => they are if the user they are reviewing is a player in their playtest
        const playtestCol = await Collections.playtests()
        const isAllowed = !!await playtestCol.findOne({
            userId: ctx.auth.userId,
            _id: new ObjectId(input.review.duringPlaytestId),
            applications: {
                $elemMatch: {
                    applicantId: input.playtesterId,
                    status: "accepted",
                }
            },
        }, { projection: { _id: true } })
        if (!isAllowed) throw new Error('Unauthorized')

        // 2. Save the review
        const usersCol = await Collections.users()
        const result = await usersCol.updateOne({
            userId: input.playtesterId,
        }, { $push: {
            playerReviews: {
                // Only the last 100 reviews are saved
                $slice: -100,

                // We need to use $each, even for a single array insert, because otherwise we can't use $slice
                $each: [
                    {
                        ...input.review,
                        createdTimestamp: Date.now(),
                        byUserId: ctx.auth.userId,
                    },
                ],
            },
        }})
    })

const banUser = protectedProcedure
    .input(z.string())
    .mutation(async ({ input, ctx }) => {
        if (ctx.auth.userId !== process.env[adminConfKey]) throw new Error('Unauthorized')

        // Mark user account as banned
        const users = await Collections.users()
        const user = await users.findOneAndUpdate({ userName: input }, { $set: { banned: true } })
        if (!user) throw new Error('User not found')

        // Mark all playtests from this user as closed
        const playtests = await Collections.playtests()
        await playtests.updateMany({ userId: user.userId }, { $set: { closedManually: true } })
        
        // Save user emails so they can't dodge the ban by deleting their data
        const bannedUsers = await Collections.bannedUsers()
        if (!user.emails.length) throw new Error('No emails to ban')
        await bannedUsers.insertMany(user.emails.map(email => ({ email })))
    })

const validateUser = protectedProcedure
    .input(z.object({ userName: z.string(), href: z.string() }))
    .mutation(async ({ input: { userName, href }, ctx }) => {
        if (ctx.auth.userId !== process.env[adminConfKey]) throw new Error('Unauthorized')

        const users = await Collections.users()
        await users.updateOne({ userName }, { $set: { 'publisherProfile.manualProof': href } })
    })

export const UserRouter = router({
    updateSelf,
    updateNotifications,
    deleteSelf,
    isUsernameTaken,
    review,

    // Admin
    banUser,
    validateUser,
})
